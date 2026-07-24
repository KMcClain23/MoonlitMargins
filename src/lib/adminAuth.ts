import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { verifyPassword } from "@/lib/password";
import { sectionsForRole, type AdminRole, type AdminSection } from "@/lib/adminSections";

const SESSION_COOKIE = "mm_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

export type AdminSession = {
  adminUserId: string;
  memberId: string | null;
  fullName: string;
  role: AdminRole;
  sections: AdminSection[];
  mustChangePassword: boolean;
  canAssignTasks: boolean;
  expiry: number;
};

// Exported so other signed-token needs (see googleAuth.ts's `state` param
// for the "link a Google account" flow) reuse this exact HMAC primitive
// and encoding instead of standing up a second signing mechanism.
export function sign(value: string) {
  return createHmac("sha256", process.env.ADMIN_SESSION_SECRET!).update(value).digest("hex");
}

export function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

export function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

/** Builds a signed `payload.signature` token -- used both as the cookie
 * value for web admin and as the bearer token returned to native clients.
 * The payload carries WHO is logged in plus their role and the exact
 * sections they can access, so middleware can enforce section-level
 * permissions without a database lookup on every request. */
export function createSessionToken(session: Omit<AdminSession, "expiry">): string {
  const payload: AdminSession = { ...session, expiry: Date.now() + SESSION_TTL_MS };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function parseSessionToken(token: string | undefined | null): AdminSession | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as AdminSession;
    if (Date.now() > payload.expiry) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Resolves the current admin session from either an `Authorization: Bearer
 * <token>` header (the React Native admin app, which has no equivalent of
 * an httpOnly cookie) or the existing session cookie (web admin). Bearer is
 * checked first -- a request that carries one is unambiguously a non-browser
 * client, and an explicitly-provided-but-invalid bearer token should fail
 * outright rather than silently falling through to a cookie it never sent.
 * The cookie path is only consulted when there's no Authorization header at
 * all, so every existing web code path behaves exactly as before.
 */
export function getSessionFromRequest(request: NextRequest): AdminSession | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    if (!authHeader.startsWith("Bearer ")) return null;
    return parseSessionToken(authHeader.slice("Bearer ".length).trim());
  }

  return parseSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

// Shape shared by every path that can resolve an existing admin_users row
// into a signable session -- password login, and (see googleAuth.ts)
// Google sign-in, which looks up the same table by email instead of
// checking a password.
type AdminUserRow = {
  id: string;
  full_name: string;
  role: string;
  allowed_sections: string[] | null;
  member_id: string | null;
  must_change_password: boolean;
  can_assign_tasks: boolean;
};

/** Maps an admin_users row to the session shape createSessionToken()
 * signs -- the one place that translates a DB row into a session, so
 * every login path (password, Google) that resolves a row stays in sync
 * with role/section logic automatically. */
export function sessionFromAdminUserRow(row: AdminUserRow): Omit<AdminSession, "expiry"> {
  const role = row.role as AdminRole;
  return {
    adminUserId: row.id,
    memberId: row.member_id,
    fullName: row.full_name,
    role,
    sections: sectionsForRole(role, row.allowed_sections),
    mustChangePassword: row.must_change_password,
    canAssignTasks: row.can_assign_tasks,
  };
}

/**
 * Checks an email/password pair against admin_users and, on success,
 * returns the session payload (minus `expiry`, which createSessionToken
 * fills in) ready to sign. Shared by both the cookie-based login route and
 * the bearer token-login route so the credential check never diverges
 * between them.
 */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<Omit<AdminSession, "expiry"> | null> {
  const supabase = supabaseServer();
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("id, full_name, email, password_hash, role, allowed_sections, member_id, must_change_password, can_assign_tasks")
    .eq("email", String(email).toLowerCase().trim())
    .single();

  // Deliberately the same error for "no such email" and "wrong password" --
  // don't reveal which emails have backend access to someone probing the
  // login form.
  if (!adminUser || !verifyPassword(password, adminUser.password_hash)) {
    return null;
  }

  return sessionFromAdminUserRow(adminUser);
}

// Matches SESSION_TTL_MS above, in seconds rather than milliseconds --
// cookies.set() takes maxAge in seconds.
const SESSION_COOKIE_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;

/**
 * Sets the signed session cookie on a NextResponse -- the single place
 * that actually issues a web session, used by both password login
 * (/api/admin/login) and Google sign-in (/api/admin/auth/google/callback)
 * so their cookie options (httpOnly/secure/sameSite/maxAge) can never
 * drift apart between the two entry points.
 */
export function setSessionCookie(response: NextResponse, session: Omit<AdminSession, "expiry">): void {
  response.cookies.set(SESSION_COOKIE, createSessionToken(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  });
}

export { SESSION_COOKIE };
