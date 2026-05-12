import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const API_SERVICE_URL = "http://127.0.0.1:3001";

/**
 * POST /api/vocabulary/auto-enrich
 * Admin-only: Proxies to Python backend for bulk vocabulary enrichment from external APIs.
 */
export async function POST(request: NextRequest) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch {
      return NextResponse.json(
        { error: "Session expired. Please log in again." },
        { status: 401 }
      );
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const count = searchParams.get("count") || "100";
    const level = searchParams.get("level") || "";

    let url = `${API_SERVICE_URL}/api/vocabulary/auto-enrich?user_id=${encodeURIComponent(session.user.id)}&count=${count}`;
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
