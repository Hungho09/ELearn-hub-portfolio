import { NextRequest, NextResponse } from "next/server";
import { API_SERVICE_URL, fetchWithRetry } from "@/lib/api-config";

/**
 * GET /api/flashcards/session?user_id=xxx&limit=20
 * Proxies to Python api-service for flashcard session data.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id") || "guest";
    const limit = searchParams.get("limit") || "20";

    const res = await fetchWithRetry(
      `${API_SERVICE_URL}/api/flashcards/session?user_id=${encodeURIComponent(userId)}&limit=${limit}`
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: data.detail || "Failed to fetch session" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Session proxy error:", error);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 503 });
  }
}
