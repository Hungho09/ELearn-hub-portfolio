import { NextRequest, NextResponse } from "next/server";
import { API_SERVICE_URL, fetchWithRetry } from "@/lib/api-config";

/**
 * POST /api/flashcards/review?user_id=xxx
 * Proxies review submission to Python backend with SM-2 / TGCL algorithm.
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id") || "guest";

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { vocabulary_id, rating, direction = "en_to_vi", response_time_ms, session_id, user_answer, auto_rating } = body as Record<string, unknown>;

    if (!vocabulary_id || !rating || Number(rating) < 1 || Number(rating) > 4) {
      return NextResponse.json(
        { error: "vocabulary_id and rating (1-4) are required" },
        { status: 400 }
      );
    }

    const backendUrl = `${API_SERVICE_URL}/api/flashcards/review?user_id=${encodeURIComponent(userId)}`;

    const res = await fetchWithRetry(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vocabulary_id: Number(vocabulary_id),
        rating: Number(rating),
        direction,
        response_time_ms: response_time_ms ? Number(response_time_ms) : null,
        session_id: session_id || null,
        user_answer: user_answer || null,
        auto_rating: auto_rating ?? null,
      }),
    });

    // Parse response - handle both JSON and non-JSON responses
    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    if (!res.ok) {
      let errorDetail = "Failed to submit review";
      if (isJson) {
        try {
          const data = await res.json();
          errorDetail = data.detail || data.error || errorDetail;
        } catch {
          errorDetail = `Backend error (${res.status})`;
        }
      } else {
        errorDetail = `Backend error (${res.status}): ${res.statusText}`;
      }
      return NextResponse.json(
        { error: errorDetail },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    if (!isJson) {
      console.error("Review proxy: Backend returned non-JSON success response");
      return NextResponse.json(
        { error: "Unexpected response format from backend" },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Review proxy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit review" },
      { status: 503 }
    );
  }
}
