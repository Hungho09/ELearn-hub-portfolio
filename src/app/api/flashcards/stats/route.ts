import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/flashcards/stats?user_id=xxx
 * Get user learning statistics.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || 'guest';

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Total reviews
    const totalReviews = await db.reviewLog.count({ where: { userId } });

    // Total unique words reviewed
    const uniqueWords = await db.reviewLog.findMany({
      where: { userId },
      distinct: ['vocabularyId'],
      select: { vocabularyId: true },
    });
    const totalUniqueWords = uniqueWords.length;

    // Average ease factor
    const avgResult = await db.reviewLog.aggregate({
      where: { userId },
      _avg: { easeFactor: true },
    });
    const averageEaseFactor = avgResult._avg.easeFactor ?? 2.5;

    // Words mastered (latest ease_factor >= 2.5 and interval >= 21 days)
    const latestLogs = await db.reviewLog.groupBy({
      by: ['vocabularyId'],
      where: { userId },
      _max: { id: true },
    });
    const latestLogIds = latestLogs.map(l => l._max.id).filter(Boolean) as number[];

    let wordsMastered = 0;
    if (latestLogIds.length > 0) {
      wordsMastered = await db.reviewLog.count({
        where: {
          id: { in: latestLogIds },
          easeFactor: { gte: 2.5 },
          intervalDays: { gte: 21 },
        },
      });
    }

    // Total vocab
    const totalVocab = await db.vocabulary.count();

    // Reviews today
    const reviewsToday = await db.reviewLog.count({
      where: {
        userId,
        reviewedAt: { gte: todayStart },
      },
    });

    // Streak calculation
    let streak = 0;
    const checkDate = new Date(now);
    for (let i = 0; i < 365; i++) {
      const dayStart = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const hasReview = await db.reviewLog.findFirst({
        where: {
          userId,
          reviewedAt: { gte: dayStart, lt: dayEnd },
        },
        select: { id: true },
      });

      if (hasReview) {
        streak += 1;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (i === 0) {
          // Today might not have reviews yet - check yesterday
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }

    return NextResponse.json({
      total_reviews: totalReviews,
      total_unique_words: totalUniqueWords,
      average_ease_factor: Math.round(averageEaseFactor * 100) / 100,
      words_mastered: wordsMastered,
      words_learning: totalUniqueWords - wordsMastered,
      words_new: totalVocab - totalUniqueWords,
      streak_days: streak,
      reviews_today: reviewsToday,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
