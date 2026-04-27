import { NextRequest, NextResponse } from "next/server";

const API_SERVICE_URL = "http://127.0.0.1:3001";

/**
 * POST /api/flashcards/review?user_id=xxx
 * Proxies review submission to Python api-service with SM-2 algorithm.
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id") || "guest";

    const body = await request.json();
    const { vocabulary_id, rating, direction = "en_to_vi", response_time_ms, session_id } = body;

    if (!vocabulary_id || !rating || rating < 1 || rating > 4) {
      return NextResponse.json(
        { error: "vocabulary_id and rating (1-4) are required" },
        { status: 400 }
      );
    }

    const res = await fetch(
      `${API_SERVICE_URL}/api/flashcards/review?user_id=${encodeURIComponent(userId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vocabulary_id,
          rating,
          direction,
          response_time_ms,
          session_id,
        }),
      }
    );

    if (!res.ok) {
      const data = await res.json();
      return NextResponse.json(
        { error: data.detail || "Failed to submit review" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Review proxy error:", error);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
