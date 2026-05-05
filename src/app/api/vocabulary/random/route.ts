import { NextRequest, NextResponse } from "next/server";

const API_SERVICE_URL = "http://127.0.0.1:3001";

/**
 * GET /api/vocabulary/random?category=xxx&difficulty=1
 * Proxies to Python api-service for a random vocabulary item.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const difficulty = searchParams.get("difficulty");

    let url = `${API_SERVICE_URL}/api/vocabulary/random`;
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (difficulty) params.set("difficulty", difficulty);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetch(url);

    if (!res.ok) {
      const data = await res.json();
      return NextResponse.json(
        { error: data.detail || "Failed to fetch random word" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Vocabulary random proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch random word" },
      { status: 500 }
    );
  }
}
