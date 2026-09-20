// app/api/auth/logout/route.js - User logout handler
import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST(request) {
  try {
    const sessionCookie = request.cookies.get("cadence_session");
    if (sessionCookie?.value) {
      await destroySession(sessionCookie.value);
    }

    const response = NextResponse.json({ success: true, message: "Logged out" });
    
    // Clear session cookie
    response.cookies.set({
      name: "cadence_session",
      value: "",
      httpOnly: true,
      path: "/",
      expires: new Date(0),
    });

    return response;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
