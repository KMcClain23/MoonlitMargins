import { timingSafeEqual } from "crypto";
import { supabaseServer } from "@/lib/supabase/server";
import {
  base64UrlDecode,
  base64UrlEncode,
  sessionFromAdminUserRow,
  sign,
  type AdminSession,
} from "@/lib/adminAuth";

const GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";

/**
 * Verifies a Google ID token via Google's tokeninfo endpoint -- avoids
 * pulling in a JWT library, since Google itself validates the signature
 * and expiry and simply echoes back the decoded claims for us to check.
 * Confirms the token was actually issued for THIS app (`aud` matches
 * GOOGLE_OAUTH_CLIENT_ID) and that Google has verified the email address,
 * then returns that email. Throws on any mismatch, non-2xx response, or
 * malformed body -- callers should treat any rejection as "this token
 * cannot be trusted," not attempt to partially recover from it.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<string> {
  const response = await fetch(`${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`);
  if (!response.ok) {
    throw new Error("Google rejected this token");
  }

  const data = await response.json();

  if (data.aud !== process.env.GOOGLE_OAUTH_CLIENT_ID) {
    throw new Error("Token was not issued for this app");
  }

  // tokeninfo returns every claim as a JSON string (e.g. "true"/"false"),
  // not a real boolean -- checked against both forms defensively rather
  // than assuming the exact wire representation.
  if (data.email_verified !== "true" && data.email_verified !== true) {
    throw new Error("Google has not verified this email address");
  }

  if (typeof data.email !== "string" || !data.email) {
    throw new Error("Token did not include an email address");
  }

  return data.email;
}

const ADMIN_USER_SESSION_COLUMNS =
  "id, full_name, role, allowed_sections, member_id, must_change_password, can_assign_tasks";

/**
 * Looks up an existing admin_users row by a verified Google email --
 * matches against EITHER the account's login `email` (checked first,
 * same as always) OR a separately linked_google_email (an admin can link
 * a Google account that isn't the same address they log in with). Never
 * creates a new admin account. Returns null when neither column matches,
 * the same "not found" signal password login uses for a nonexistent
 * email, so both the web callback and the mobile token route can react
 * to it identically.
 */
export async function findAdminUserByGoogleEmail(email: string): Promise<Omit<AdminSession, "expiry"> | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const supabase = supabaseServer();

  const { data: byLoginEmail } = await supabase
    .from("admin_users")
    .select(ADMIN_USER_SESSION_COLUMNS)
    .eq("email", normalizedEmail)
    .single();

  if (byLoginEmail) {
    return sessionFromAdminUserRow(byLoginEmail);
  }

  const { data: byLinkedEmail } = await supabase
    .from("admin_users")
    .select(ADMIN_USER_SESSION_COLUMNS)
    .eq("linked_google_email", normalizedEmail)
    .single();

  if (!byLinkedEmail) return null;

  return sessionFromAdminUserRow(byLinkedEmail);
}

/**
 * Builds the signed `state` param for the "link a Google account" flow
 * (GET /api/admin/auth/google/link). Proves to the callback that this
 * authorization request genuinely originated from an authenticated
 * linking action for this specific admin_user, rather than a forged or
 * replayed request -- the callback can't just trust a plain adminUserId
 * query param, since anyone could supply one. Reuses adminAuth's HMAC
 * signing primitive and base64url encoding rather than a second signing
 * mechanism, mirroring the exact `payload.signature` shape
 * createSessionToken() already uses for session tokens.
 */
export function createLinkState(adminUserId: string): string {
  const encoded = base64UrlEncode(adminUserId);
  return `${encoded}.${sign(encoded)}`;
}

/**
 * Verifies a `state` param produced by createLinkState() and returns the
 * adminUserId it was signed for, or null if the param is missing,
 * malformed, or its signature doesn't match (tampered or forged). A null
 * return is also how the callback route tells "plain login" (no state at
 * all) apart from "linking" (a valid one).
 */
export function verifyLinkState(state: string | null): string | null {
  if (!state) return null;
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    return base64UrlDecode(encoded);
  } catch {
    return null;
  }
}

export type LinkGoogleEmailResult = "linked" | "already_linked" | "error";

/**
 * Attaches a verified Google email to an EXISTING admin_users row (by
 * id) -- the write side of linking, as opposed to
 * findAdminUserByGoogleEmail's read-only lookup. linked_google_email is
 * a unique column, so linking an email already linked to a DIFFERENT
 * admin_user fails with a Postgres unique_violation (23505), which is
 * caught here and reported distinctly so the callback can redirect with
 * a clear "already_linked" error instead of a generic failure.
 */
export async function linkGoogleEmailToAdminUser(
  adminUserId: string,
  email: string
): Promise<LinkGoogleEmailResult> {
  const supabase = supabaseServer();
  const { error } = await supabase
    .from("admin_users")
    .update({ linked_google_email: email.toLowerCase().trim() })
    .eq("id", adminUserId);

  if (!error) return "linked";
  if (error.code === "23505") return "already_linked";
  return "error";
}
