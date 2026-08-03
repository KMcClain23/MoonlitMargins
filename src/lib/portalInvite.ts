import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPortalSetupInviteEmail } from "@/lib/resend";
import { absoluteUrl } from "@/lib/seo";

const SETUP_TOKEN_TTL_MS = 1000 * 60 * 60 * 72; // 72 hours

/**
 * Generates a fresh portal setup token for a member, saves it, and
 * (best-effort) emails the invite link -- shared by the applications
 * acceptance flow (api/admin/applications/[id]/route.ts) and the admin-
 * triggered send/resend routes (api/admin/members/[id]/portal-invite and
 * .../bulk-portal-invite), so all three entry points can never drift
 * apart on token TTL, URL shape, or the email template used.
 *
 * Always returns the setup URL, even if the email send fails or the
 * member has no email on file to send to at all -- an admin can copy and
 * hand it over some other way, which matters right now since Resend is
 * still on its sandbox sender domain and delivery isn't reliable yet.
 */
export async function issuePortalInvite(
  supabase: SupabaseClient,
  member: { id: string; full_name: string; email: string | null }
): Promise<{ setupUrl: string } | null> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SETUP_TOKEN_TTL_MS).toISOString();

  const { error } = await supabase
    .from("members")
    .update({ auth_setup_token: token, auth_setup_token_expires_at: expiresAt })
    .eq("id", member.id);

  if (error) {
    console.error("[portalInvite] Could not set auth_setup_token for", member.id, error);
    return null;
  }

  const setupUrl = absoluteUrl(`/portal/setup?token=${token}`);

  if (member.email) {
    try {
      await sendPortalSetupInviteEmail({
        recipientEmail: member.email,
        fullName: member.full_name,
        setupUrl,
      });
    } catch (err) {
      console.error("[portalInvite] Email threw:", err);
    }
  }

  return { setupUrl };
}
