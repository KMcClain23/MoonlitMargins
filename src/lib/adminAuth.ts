import { createHmac, timingSafeEqual } from "crypto";
import type { AdminRole, AdminSection } from "@/lib/adminSections";

const SESSION_COOKIE = "mm_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

export type AdminSession = {
  adminUserId: string;
  memberId: string | null;
  fullName: string;
  role: AdminRole;
  sections: AdminSection[];
  mustChangePassword: boolean;
  expiry: number;
};

function sign(value: string) {
  return createHmac("sha256", process.env.ADMIN_SESSION_SECRET!).update(value).digest("hex");
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

/** Builds a signed `payload.signature` token to store in the cookie. The
 * payload carries WHO is logged in (unlike the old single-shared-password
 * scheme, which only encoded an expiry with no identity at all) plus their
 * role and the exact sections they can access, so middleware can enforce
 * section-level permissions without a database lookup on every request. */
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

export { SESSION_COOKIE };
