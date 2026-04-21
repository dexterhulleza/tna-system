/**
 * Custom Authentication Helpers
 * Handles password hashing, JWT session creation, and audit logging
 * for the standalone registration/login system.
 */
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { randomBytes } from "crypto";
import { getDb } from "./db";
import { users, auditLogs } from "../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";
import { ENV } from "./_core/env";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Request, Response } from "express";
import { getSessionCookieOptions } from "./_core/cookies";

// ─── Password helpers ─────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Session helpers ──────────────────────────────────────────────────────────

function getSessionSecret() {
  const secret = ENV.cookieSecret;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: {
  openId: string;
  appId: string;
  name: string;
}): Promise<string> {
  const expirationSeconds = Math.floor((Date.now() + ONE_YEAR_MS) / 1000);
  return new SignJWT({
    openId: payload.openId,
    appId: payload.appId,
    name: payload.name,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(getSessionSecret());
}

export function setSessionCookie(req: Request, res: Response, token: string) {
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: ONE_YEAR_MS,
  });
}

// ─── Reset token helpers ──────────────────────────────────────────────────────

export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

export function getResetTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 2); // 2 hours
  return expiry;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0] ?? null;
}

export async function getUserByResetToken(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = new Date();
  const result = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.resetToken, token),
        gt(users.resetTokenExpiry, now)
      )
    )
    .limit(1);
  return result[0] ?? null;
}

export async function setResetToken(userId: number, token: string, expiry: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ resetToken: token, resetTokenExpiry: expiry })
    .where(eq(users.id, userId));
}

export async function clearResetToken(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ resetToken: null, resetTokenExpiry: null })
    .where(eq(users.id, userId));
}

export async function updatePassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ passwordHash, resetToken: null, resetTokenExpiry: null })
    .where(eq(users.id, userId));
}

// ─── Audit log helper ─────────────────────────────────────────────────────────

export async function createAuditLog(params: {
  userId?: number | null;
  userEmail?: string | null;
  userName?: string | null;
  action: string;
  module: string;
  details?: string | null;
  ipAddress?: string | null;
}) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(auditLogs).values({
      userId: params.userId ?? null,
      userEmail: params.userEmail ?? null,
      userName: params.userName ?? null,
      action: params.action,
      module: params.module,
      details: params.details ?? null,
      ipAddress: params.ipAddress ?? null,
    });
  } catch (e) {
    // Non-fatal — don't let audit log failures break the main flow
    console.error("[AuditLog] Failed to write:", e);
  }
}

// ─── Generate a unique openId for custom-auth users ───────────────────────────

export function generateOpenId(): string {
  return `local_${randomBytes(16).toString("hex")}`;
}
