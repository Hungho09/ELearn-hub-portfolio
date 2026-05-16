import { NextRequest, NextResponse } from "next/server";
import { API_SERVICE_URL, fetchWithRetry } from "@/lib/api-config";

/**
 * GET /api/flashcards/stats?user_id=xxx
 * Proxies to Python api-service for user learning statistics.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id") || "guest";

    const res = await fetchWithRetry(
      `${API_SERVICE_URL}/api/flashcards/stats?user_id=${encodeURIComponent(userId)}`
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: data.detail || "Failed to fetch stats" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Stats proxy error:", error);
    // Return graceful fallback instead of 500 — UI stays functional
    return NextResponse.json({
      total_reviews: 0,
      total_unique_words: 0,
      average_ease_factor: 2.5,
      words_mastered: 0,
      words_learning: 0,
      words_new: 0,
      streak_days: 0,
      reviews_today: 0,
      xpPoints: 0,
      currentLevel: 1,
      nextLevelXp: 100,
      badges: [],
      _degraded: true,
    });
  }
}
