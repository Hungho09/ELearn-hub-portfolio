import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/flashcards/session?user_id=xxx&limit=20
 * Get a study session with due cards and new cards.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || 'guest';
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const now = new Date();

    // ── Get due cards (reviewed before, nextReviewAt <= now) ──
    const latestLogs = await db.reviewLog.groupBy({
      by: ['vocabularyId'],
      where: { userId },
      _max: { id: true },
    });

    const latestLogIds = latestLogs.map(l => l._max.id).filter(Boolean) as number[];

    const dueLogs = latestLogIds.length > 0
      ? await db.reviewLog.findMany({
          where: {
            id: { in: latestLogIds },
            nextReviewAt: { lte: now },
          },
          select: { vocabularyId: true },
        })
      : [];

    const dueIds = dueLogs.map(l => l.vocabularyId);

    const dueVocab = dueIds.length > 0
      ? await db.vocabulary.findMany({
          where: { id: { in: dueIds } },
          take: limit,
        })
      : [];

    // ── Get new cards (never reviewed) ──
    const reviewedIds = await db.reviewLog.findMany({
      where: { userId },
      distinct: ['vocabularyId'],
      select: { vocabularyId: true },
    });
    const reviewedIdList = reviewedIds.map(r => r.vocabularyId);

    const remaining = limit - dueVocab.length;
    const newVocab = remaining > 0
      ? await db.vocabulary.findMany({
          where: reviewedIdList.length > 0
            ? { id: { notIn: reviewedIdList } }
            : {},
          orderBy: [{ difficultyLevel: 'asc' }, { id: 'asc' }],
          take: remaining,
        })
      : [];

    // ── Count totals ──
    const totalReviewed = await db.reviewLog.findMany({
      where: { userId },
      distinct: ['vocabularyId'],
      select: { vocabularyId: true },
    });

    const totalVocab = await db.vocabulary.count();

    const formatVocab = (v: { id: number; english: string; vietnamese: string; pronunciation: string | null; exampleEnglish: string | null; exampleVietnamese: string | null; partOfSpeech: string | null; category: string | null; difficultyLevel: number }) => ({
      id: v.id,
      english: v.english,
      vietnamese: v.vietnamese,
      pronunciation: v.pronunciation,
      example_english: v.exampleEnglish,
      example_vietnamese: v.exampleVietnamese,
      part_of_speech: v.partOfSpeech,
      category: v.category,
      difficulty_level: v.difficultyLevel,
    });

    return NextResponse.json({
      due_cards: dueVocab.map(formatVocab),
      new_cards: newVocab.map(formatVocab),
      total_due: dueIds.length,
      total_new: totalVocab - totalReviewed.length,
      total_learned: totalReviewed.length,
    });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}
