import { NextRequest, NextResponse } from "next/server";
import { API_SERVICE_URL, fetchWithRetry } from "@/lib/api-config";

/**
 * GET /api/flashcards/categories?user_id=xxx
 * Proxies to Python api-service for learning progress by category.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id") || "guest";

    const res = await fetchWithRetry(
      `${API_SERVICE_URL}/api/flashcards/categories?user_id=${encodeURIComponent(userId)}`
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: data.detail || "Failed to fetch categories" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Categories proxy error:", error);
    // Return graceful fallback — empty categories instead of 500
    return NextResponse.json([]);
  }
}
