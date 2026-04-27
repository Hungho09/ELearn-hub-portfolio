import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/flashcards/categories?user_id=xxx
 * Get learning progress by vocabulary category.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || 'guest';

    // Get all categories
    const categories = await db.vocabulary.findMany({
      distinct: ['category'],
      where: { category: { not: null } },
      select: { category: true },
    });

    const result = [];

    for (const { category } of categories) {
      if (!category) continue;

      // Total words in category
      const total = await db.vocabulary.count({ where: { category } });

      // Words reviewed in this category
      const learned = await db.reviewLog.findMany({
        where: { userId, vocabulary: { category } },
        distinct: ['vocabularyId'],
        select: { vocabularyId: true },
      });

      // Mastered in this category
      const latestLogs = await db.reviewLog.groupBy({
        by: ['vocabularyId'],
        where: {
          userId,
          vocabulary: { category },
        },
        _max: { id: true },
      });
      const latestLogIds = latestLogs.map(l => l._max.id).filter(Boolean) as number[];

      let mastered = 0;
      if (latestLogIds.length > 0) {
        mastered = await db.reviewLog.count({
          where: {
            id: { in: latestLogIds },
            easeFactor: { gte: 2.5 },
            intervalDays: { gte: 21 },
          },
        });
      }

      // Average ease factor
      const avgResult = await db.reviewLog.aggregate({
        where: { userId, vocabulary: { category } },
        _avg: { easeFactor: true },
      });

      result.push({
        category,
        total_words: total,
        learned_words: learned.length,
        mastered_words: mastered,
        average_ease_factor: Math.round((avgResult._avg.easeFactor ?? 2.5) * 100) / 100,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Categories error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
