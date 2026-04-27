import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateSM2 } from '@/lib/spaced-repetition';

/**
 * POST /api/flashcards/review?user_id=xxx
 * Submit a review for a vocabulary card using SM-2 spaced repetition.
 *
 * Body: { vocabulary_id, rating (1-4), direction, response_time_ms?, session_id? }
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || 'guest';

    const body = await request.json();
    const { vocabulary_id, rating, direction = 'en_to_vi', response_time_ms, session_id } = body;

    if (!vocabulary_id || !rating || rating < 1 || rating > 4) {
      return NextResponse.json(
        { error: 'vocabulary_id and rating (1-4) are required' },
        { status: 400 }
      );
    }

    // Verify vocabulary exists
    const vocab = await db.vocabulary.findUnique({ where: { id: vocabulary_id } });
    if (!vocab) {
      return NextResponse.json({ error: 'Vocabulary not found' }, { status: 404 });
    }

    // Get latest review log for this user+vocab
    const latestLog = await db.reviewLog.findFirst({
      where: { userId, vocabularyId: vocabulary_id },
      orderBy: { reviewedAt: 'desc' },
    });

    // Calculate SM-2 parameters
    const currentEF = latestLog?.easeFactor ?? 2.5;
    const currentInterval = latestLog?.intervalDays ?? 0;
    const currentReps = latestLog?.repetitions ?? 0;

    const result = calculateSM2(rating, currentEF, currentInterval, currentReps);

    // Create review log
    const log = await db.reviewLog.create({
      data: {
        userId,
        vocabularyId: vocabulary_id,
        rating,
        easeFactor: result.easeFactor,
        intervalDays: result.intervalDays,
        repetitions: result.repetitions,
        nextReviewAt: result.nextReviewAt,
        responseTimeMs: response_time_ms ?? null,
        direction,
        sessionId: session_id ?? null,
      },
    });

    return NextResponse.json({
      vocabulary_id,
      rating,
      new_interval_days: result.intervalDays,
      new_ease_factor: result.easeFactor,
      new_repetitions: result.repetitions,
      next_review_at: result.nextReviewAt.toISOString(),
    });
  } catch (error) {
    console.error('Review error:', error);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
