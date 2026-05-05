import { NextRequest, NextResponse } from "next/server";

const API_SERVICE_URL = "http://127.0.0.1:3001";

/**
 * POST /api/vocabulary/enrich?count=10&level=1
 * Proxies to Python api-service for vocabulary enrichment from external APIs.
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const count = searchParams.get("count") || "10";
    const level = searchParams.get("level");

    let url = `${API_SERVICE_URL}/api/vocabulary/enrich?count=${count}`;
    if (level) url += `&level=${level}`;

    const res = await fetch(url, { method: "POST" });

    if (!res.ok) {
      const data = await res.json();
      return NextResponse.json(
        { error: data.detail || "Failed to enrich vocabulary" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Vocabulary enrich proxy error:", error);
    return NextResponse.json(
      { error: "Failed to enrich vocabulary" },
      { status: 500 }
    );
  }
}
