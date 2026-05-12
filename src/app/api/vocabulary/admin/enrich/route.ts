import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const API_SERVICE_URL = "http://127.0.0.1:3001";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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
    if (level) url += `&level=${level}`;

    const res = await fetch(url, { method: "POST" });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ detail: "Backend error" }));
      return NextResponse.json({ error: data.detail || "Failed to enrich vocabulary" }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin enrich error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
