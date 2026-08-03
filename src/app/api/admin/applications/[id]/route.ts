import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { updateApplicationStatusInSheet, deleteApplicationRowFromSheet } from "@/lib/googleSheets";
import { sendPortalSetupInviteEmail } from "@/lib/resend";
import { absoluteUrl } from "@/lib/seo";

const VALID_STATUSES = ["pending", "in_review", "accepted", "declined"];
const SETUP_TOKEN_TTL_MS = 1000 * 60 * 60 * 72; // 72 hours

// Applications and members are two separate tables with no foreign key
// between them -- accepting an application has never automatically
// created a members row (that's still a separate, manual step in the
// admin Members UI). So this can only send a portal invite when a
// members row with a matching email ALREADY exists at the moment of
// acceptance; if the admin hasn't created that member row yet, there's
// nothing to attach a setup token to and this silently does nothing.
// Case-insensitive on purpose -- applications.email is stored exactly as
// the applicant typed it, with no normalization, so an exact match would
// miss anything that isn't byte-for-byte identical casing.
async function sendPortalInviteIfMemberExists(
  supabase: ReturnType<typeof supabaseServer>,
  applicationEmail: string,
  applicationFullName: string
) {
  const { data: member } = await supabase
    .from("members")
    .select("id, full_name, email")
    .ilike("email", applicationEmail)
    .maybeSingle();

  if (!member) {
    console.warn(
      `[applications] Accepted application for ${applicationFullName} <${applicationEmail}> has no matching members row yet -- no portal invite sent. Create the member record (with the same email) to trigger one.`
    );
    return;
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SETUP_TOKEN_TTL_MS).toISOString();

  const { error } = await supabase
    .from("members")
    .update({ auth_setup_token: token, auth_setup_token_expires_at: expiresAt })
    .eq("id", member.id);

  if (error) {
    console.error("[applications] Could not set auth_setup_token for", member.id, error);
    return;
  }

  // Best-effort, same "never block the local operation" rule as every
  // other email/sync side effect in this app -- the application is
  // already marked accepted and the token is already saved either way.
  // Depends on Resend actually being configured with a verified sending
  // domain; until then this fails silently, same as every other email
  // send here (see sendPortalSetupInviteEmail's own doc comment).
  try {
    await sendPortalSetupInviteEmail({
      recipientEmail: member.email as string,
      fullName: member.full_name as string,
      setupUrl: absoluteUrl(`/portal/setup?token=${token}`),
    });
  } catch (err) {
    console.error("[applications] Portal invite email threw:", err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status } = await request.json();

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { error, data: updated } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", id)
    .select("kind, full_name, email")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  try {
    await updateApplicationStatusInSheet(id, status, updated.kind);
  } catch {
    // Same "never block on this" rule as everywhere else this syncs.
  }

  if (status === "accepted") {
    await sendPortalInviteIfMemberExists(supabase, updated.email, updated.full_name);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = supabaseServer();

  const { error, data: deleted } = await supabase
    .from("applications")
    .delete()
    .eq("id", id)
    .select("kind")
    .single();

  if (error || !deleted) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  try {
    await deleteApplicationRowFromSheet(id, deleted.kind);
  } catch {
    // Same "never block on this" rule as everywhere else this syncs.
  }

  return NextResponse.json({ success: true });
}
