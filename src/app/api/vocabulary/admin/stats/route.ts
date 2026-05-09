import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const API_SERVICE_URL = "http://127.0.0.1:3001";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const res = await fetch(`${API_SERVICE_URL}/api/vocabulary/admin/stats?user_id=${encodeURIComponent(session.user.id)}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({ detail: "Backend error" }));
      return NextResponse.json({ error: data.detail || "Failed to fetch stats" }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.message?.includes("decryption")) {
      return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
    }
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
