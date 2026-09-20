// app/api/auth/login/route.js - User authentication handler
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import {
  verifyPassword,
  createSession,
  ensureAdminUser,
  getAdminPasswordHash,
  ADMIN_EMAIL,
} from "@/lib/auth";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    let user = null;

    // Try verifying with MongoDB
    try {
      await ensureAdminUser();
      const db = await getDatabase();
      user = await db.collection("users").findOne({ email: cleanEmail });
    } catch (dbErr) {
      console.warn("[Login API] MongoDB offline, falling back to secure local verification:", dbErr.message);
    }

    let isValid = false;
    let userId = "cadence_admin_user";

    if (user) {
      isValid = verifyPassword(password, user.passwordHash);
      userId = user._id.toString();
    } else if (cleanEmail === ADMIN_EMAIL) {
      // Fallback verification against the admin hashed password
      const adminHash = getAdminPasswordHash();
      isValid = verifyPassword(password, adminHash);
    }

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const { sessionToken, expiresAt } = await createSession(userId, cleanEmail);

    const response = NextResponse.json({
      success: true,
      user: {
        email: cleanEmail,
        name: "Rustam",
      },
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: "cadence_session",
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return response;
  } catch (err) {
    console.error("[Login API Error]", err);
    return NextResponse.json(
      { error: err.message || "Authentication failed" },
      { status: 500 }
    );
  }
}
