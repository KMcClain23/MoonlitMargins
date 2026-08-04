import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { verifyPassword } from "@/lib/password";

// A completely separate auth system from adminAuth.ts -- same HMAC-signed
// token *shape* (deliberately mirrored for consistency), but its own
// secret (MEMBER_SESSION_SECRET, never ADMIN_SESSION_SECRET), its own
// cookie name, and its own session payload. A member session must never
// be readable as an admin session or vice versa; nothing here imports
// from, or is imported by, adminAuth.ts.

const SESSION_COOKIE = "member_session";
// Longer-lived than the admin session (12h) -- the member portal is a
// consumer-facing "log in and stay logged in" surface, not an internal
// tool handling sensitive admin operations, so a 30-day session matches
// normal expectations for that kind of product rather than admin's
// shift-length TTL.
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export type MemberSession = {
  memberId: string;
  fullName: string;
  email: string;
  expiry: number;
  // Only ever set on a token minted via the admin-login bridge (see
  // /api/admin/auth/token-login), never on a real member's own login --
  // a snapshot of that admin_users row's granted sections at sign-in time
  // (same staleness window as the admin's own session token). A plain
  // string[], not AdminSection[]: this file deliberately never imports
  // from adminAuth.ts (see the top-of-file comment), and a value import
  // would cross that line even though a type-only one wouldn't.
  adminSections?: string[];
};

export function sign(value: string) {
  return createHmac("sha256", process.env.MEMBER_SESSION_SECRET!).update(value).digest("hex");
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

/** Builds a signed `payload.signature` token for the member session
 * cookie -- same encoding as adminAuth.ts's createSessionToken, kept as a
 * separate implementation (not a shared helper) so the two auth systems
 * can never accidentally share a signing path. */
export function createMemberSessionToken(session: Omit<MemberSession, "expiry">): string {
  const payload: MemberSession = { ...session, expiry: Date.now() + SESSION_TTL_MS };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function parseMemberSessionToken(token: string | undefined | null): MemberSession | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as MemberSession;
    if (Date.now() > payload.expiry) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Resolves the current member session from either an `Authorization: Bearer
 * <token>` header (a native client with no equivalent of an httpOnly
 * cookie) or the existing session cookie (web portal). Bearer is checked
 * first -- a request that carries one is unambiguously a non-browser
 * client, and an explicitly-provided-but-invalid bearer token should fail
 * outright rather than silently falling through to a cookie it never sent.
 * The cookie path is only consulted when there's no Authorization header at
 * all, so every existing web code path behaves exactly as before. Same
 * dual-path pattern as adminAuth.ts's getSessionFromRequest.
 */
export function getMemberSessionFromRequest(request: NextRequest): MemberSession | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    if (!authHeader.startsWith("Bearer ")) return null;
    return parseMemberSessionToken(authHeader.slice("Bearer ".length).trim());
  }

  return parseMemberSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

/**
 * Gates the mobile-only Contacts/Reviews/Orientation routes below. A real
 * member's own session never has adminSections set, so this always passes
 * for them -- unaffected, exactly as before this permission system existed.
 * It only actually filters an admin-bridge session (adminSections set),
 * requiring the owner to have explicitly granted that section to this
 * admin_user via the Users management page, the same allowed_sections
 * mechanism that already gates Members/Memories/Planner/etc.
 */
export function memberSessionHasAdminSection(session: MemberSession, section: string): boolean {
  return !session.adminSections || session.adminSections.includes(section);
}

/**
 * Checks an email/password pair against members.password_hash and, on
 * success, returns the session payload (minus `expiry`) ready to sign.
 * Deliberately the same generic error for "no such email," "no password
 * set yet" (never completed /portal/setup), and "wrong password" -- none
 * of those should be distinguishable to whoever's at the login form.
 */
export async function verifyMemberCredentials(
  email: string,
  password: string
): Promise<Omit<MemberSession, "expiry"> | null> {
  const supabase = supabaseServer();
  const { data: member } = await supabase
    .from("members")
    .select("id, full_name, email, password_hash")
    .eq("email", String(email).toLowerCase().trim())
    .maybeSingle();

  if (!member || !member.password_hash || !verifyPassword(password, member.password_hash)) {
    return null;
  }

  return { memberId: member.id, fullName: member.full_name, email: member.email as string };
}

// Matches SESSION_TTL_MS above, in seconds rather than milliseconds --
// cookies.set() takes maxAge in seconds.
const SESSION_COOKIE_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;

/** Sets the signed member session cookie on a NextResponse -- the single
 * place that actually issues a portal session, used by both
 * /api/portal/auth/setup and /api/portal/auth/login so their cookie
 * options can never drift apart between the two entry points. */
export function setMemberSessionCookie(response: NextResponse, session: Omit<MemberSession, "expiry">): void {
  response.cookies.set(SESSION_COOKIE, createMemberSessionToken(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  });
}

export { SESSION_COOKIE };
