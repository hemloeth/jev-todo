// lib/auth.js - Authentication utilities and password hashing for Cadence
import crypto from "crypto";
import { cookies } from "next/headers";
import { getDatabase } from "./mongodb";

const AUTH_SECRET = process.env.AUTH_SECRET || "cadence_secure_session_key_2026";
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "ironudede0011@gmail.com").toLowerCase();
export const ADMIN_INITIAL_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD || "Cadence-Focus-2026!";

// Pre-compute the hashed password for the admin user
let cachedAdminHash = null;

export function getAdminPasswordHash() {
  if (!cachedAdminHash) {
    cachedAdminHash = hashPassword(ADMIN_INITIAL_PASSWORD);
  }
  return cachedAdminHash;
}

/**
 * Hash a plain password using scrypt with a unique random salt
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verify a plain password against the stored salt:hash
 */
export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;
  try {
    const [salt, key] = storedHash.split(":");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(key, "hex");
    return crypto.timingSafeEqual(derivedKey, keyBuffer);
  } catch {
    return false;
  }
}

/**
 * Sign session payload with HMAC-SHA256
 */
function signPayload(payload) {
  return crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("hex");
}

/**
 * Ensure admin user exists in the MongoDB 'users' collection on startup
 */
export async function ensureAdminUser() {
  try {
    const db = await getDatabase();
    const usersCol = db.collection("users");

    const existing = await usersCol.findOne({ email: ADMIN_EMAIL });
    if (!existing) {
      const hashedPassword = getAdminPasswordHash();
      await usersCol.insertOne({
        email: ADMIN_EMAIL,
        passwordHash: hashedPassword,
        name: "Rustam",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`[Cadence Auth] Initialized user account for ${ADMIN_EMAIL} in MongoDB`);
    }
    return true;
  } catch (err) {
    // MongoDB might be currently starting up or offline
    console.warn("[Cadence Auth] MongoDB connection offline, using memory credentials fallback:", err.message);
    return false;
  }
}

/**
 * Create a session token (signed with HMAC, and persisted to MongoDB if available)
 */
export async function createSession(userId, email) {
  const expiryTimestamp = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const expiresAt = new Date(expiryTimestamp);

  const payload = `${userId}:${email}:${expiryTimestamp}`;
  const sig = signPayload(payload);
  const sessionToken = `${payload}:${sig}`;

  try {
    const db = await getDatabase();
    await db.collection("sessions").insertOne({
      sessionToken,
      userId,
      email,
      expiresAt,
      createdAt: new Date(),
    });
  } catch (err) {
    console.warn("[Cadence Auth] MongoDB session store offline, signed token active:", err.message);
  }

  return { sessionToken, expiresAt };
}

/**
 * Validate a session token from request cookies
 */
export async function getSessionUser(sessionToken) {
  if (!sessionToken) return null;

  const parts = sessionToken.split(":");
  if (parts.length < 4) return null;

  const [userId, email, expiryStr, signature] = parts;
  const expiry = parseInt(expiryStr, 10);

  if (isNaN(expiry) || Date.now() > expiry) {
    return null; // Expired
  }

  // Validate HMAC signature
  const expectedPayload = `${userId}:${email}:${expiryStr}`;
  const expectedSig = signPayload(expectedPayload);

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return null; // Invalid signature
  }

  return {
    userId,
    email,
    name: "Rustam",
  };
}

/**
 * Delete a session on logout
 */
export async function destroySession(sessionToken) {
  if (!sessionToken) return;
  try {
    const db = await getDatabase();
    await db.collection("sessions").deleteOne({ sessionToken });
  } catch (err) {
    console.warn("[Cadence Auth] Error destroying DB session:", err.message);
  }
}

/**
 * Get current authenticated user from request cookie header
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("cadence_session")?.value;
    if (!sessionToken) return null;

    const session = await getSessionUser(sessionToken);
    if (!session) return null;

    return {
      _id: session.userId,
      email: session.email,
      name: session.name || "Rustam",
    };
  } catch (err) {
    console.warn("[Cadence Auth] Error resolving current user:", err.message);
    return null;
  }
}
