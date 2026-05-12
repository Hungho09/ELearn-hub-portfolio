import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const API_SERVICE_URL = "http://127.0.0.1:3001";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const limit = searchParams.get("limit") || "50";
    const skip = searchParams.get("skip") || "0";

    let url = `${API_SERVICE_URL}/api/vocabulary?limit=${limit}&skip=${skip}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const res = await fetch(url);
    if (!res.ok) {
      const data = await res.json().catch(() => ({ detail: "Backend error" }));
      return NextResponse.json({ error: data.detail || "Failed to fetch vocabulary" }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin list vocab error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
