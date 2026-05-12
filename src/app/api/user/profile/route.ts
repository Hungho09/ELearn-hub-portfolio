import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const API_SERVICE_URL = "http://127.0.0.1:3001";

/**
 * GET /api/user/profile
 * Proxies to Python api-service with user_id from NextAuth session.
 */
export async function GET() {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch (error) {
    console.error("[Auth] Get profile session error:", error);
    return NextResponse.json(
      { error: "Session expired. Please log in again." },
      { status: 401 }
    );
  }

  try {
    if (!session?.user?.id) {
      console.warn("[Auth] Get profile: No valid session. session=", JSON.stringify(session));
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const res = await fetch(
      `${API_SERVICE_URL}/api/user/profile?user_id=${encodeURIComponent(session.user.id)}`
    );

    if (!res.ok) {
      const data = await res.json();
      return NextResponse.json(
        { error: data.detail || "Failed to fetch profile" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Profile] Get proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/profile
 * Proxies to Python api-service with user_id from NextAuth session.
 */
export async function PUT(request: NextRequest) {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch (error) {
    console.error("[Auth] Update profile session error:", error);
    return NextResponse.json(
      { error: "Session expired. Please log in again." },
      { status: 401 }
    );
  }

  try {
    if (!session?.user?.id) {
      console.warn("[Auth] Update profile: No valid session. session=", JSON.stringify(session));
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, bio } = body;

    const res = await fetch(
      `${API_SERVICE_URL}/api/user/profile?user_id=${encodeURIComponent(session.user.id)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio }),
      }
    );

    if (!res.ok) {
      const data = await res.json();
      return NextResponse.json(
        { error: data.detail || "Failed to update profile" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Profile] Update proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
