import { NextRequest, NextResponse } from "next/server";

const API_SERVICE_URL = "http://127.0.0.1:3001";

/**
 * POST /api/vocabulary/auto-enrich
 * Proxies to Python backend for bulk vocabulary enrichment from external APIs.
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const count = searchParams.get("count") || "100";
    const level = searchParams.get("level") || "";

    let url = `${API_SERVICE_URL}/api/vocabulary/auto-enrich?count=${count}`;
    if (level) {
      url += `&level=${level}`;
    }

    const res = await fetch(url, { method: "POST" });

    if (!res.ok) {
      let errorDetail = "Failed to auto-enrich vocabulary";
      try {
        const data = await res.json();
        errorDetail = data.detail || data.error || errorDetail;
      } catch {
        errorDetail = `Backend error (${res.status}): ${res.statusText}`;
      }
      return NextResponse.json(
        { error: errorDetail },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Auto-enrich proxy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to auto-enrich vocabulary" },
      { status: 500 }
    );
  }
}
