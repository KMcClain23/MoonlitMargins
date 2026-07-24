import { supabaseServer } from "@/lib/supabase/server";
import { sessionFromAdminUserRow, type AdminSession } from "@/lib/adminAuth";

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

/**
 * Looks up an existing admin_users row by email (case-insensitive) and
 * returns it in the same session shape verifyCredentials() builds for
 * password login -- this NEVER creates a new admin account. Returns null
 * when no admin exists for this email, the same "not found" signal
 * password login uses for a nonexistent email, so both the web callback
 * and the mobile token route can react to it identically.
 */
export async function findAdminUserByGoogleEmail(email: string): Promise<Omit<AdminSession, "expiry"> | null> {
  const supabase = supabaseServer();
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("id, full_name, role, allowed_sections, member_id, must_change_password, can_assign_tasks")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (!adminUser) return null;

  return sessionFromAdminUserRow(adminUser);
}
