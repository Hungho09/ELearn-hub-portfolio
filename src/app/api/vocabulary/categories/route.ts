import { NextRequest, NextResponse } from "next/server";

const API_SERVICE_URL = "http://127.0.0.1:3001";

/**
 * GET /api/vocabulary/categories
 * Proxies to Python api-service for vocabulary categories with word counts.
 */
export async function GET() {
  try {
    const res = await fetch(`${API_SERVICE_URL}/api/vocabulary/categories`);

    if (!res.ok) {
      const data = await res.json();
      return NextResponse.json(
        { error: data.detail || "Failed to fetch categories" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Vocabulary categories proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
