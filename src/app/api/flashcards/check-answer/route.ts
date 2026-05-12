import { NextRequest, NextResponse } from "next/server";

const API_SERVICE_URL = "http://127.0.0.1:3001";

/**
 * POST /api/flashcards/check-answer
 * Proxies answer checking to Python api-service for auto-grading.
 *
 * Body: { vocabulary_id, user_answer, direction }
 * Response: { vocabulary_id, correct_answer, user_answer, rating, accuracy, is_correct, match_type, similarity, pronunciation, example_english, example_vietnamese }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vocabulary_id, user_answer, direction } = body;

    if (!vocabulary_id || !user_answer || !direction) {
      return NextResponse.json(
        { error: "vocabulary_id, user_answer, and direction are required" },
        { status: 400 }
      );
    }

    const res = await fetch(
      `${API_SERVICE_URL}/api/flashcards/check-answer`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vocabulary_id,
          user_answer,
          direction,
        }),
      }
    );

    if (!res.ok) {
      const data = await res.json();
      return NextResponse.json(
        { error: data.detail || "Failed to check answer" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Check-answer proxy error:", error);
    return NextResponse.json(
      { error: "Failed to check answer" },
      { status: 500 }
    );
  }
}
