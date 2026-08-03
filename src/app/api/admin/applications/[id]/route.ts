import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { updateApplicationStatusInSheet, deleteApplicationRowFromSheet } from "@/lib/googleSheets";
import { issuePortalInvite } from "@/lib/portalInvite";
import type { SocialsMap } from "@/lib/socials";

const VALID_STATUSES = ["pending", "in_review", "accepted", "declined"];

type AcceptedApplication = {
  full_name: string;
  email: string;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  answers: Record<string, string> | null;
};

/**
 * Finds the members row an accepted application should attach its portal
 * invite to, creating one if none exists yet. Applications and members are
 * still two separate tables with no foreign key between them, but this is
 * now the one place that bridges them automatically, rather than depending
 * on an admin having pre-created a matching member by hand -- that's still
 * supported (an admin who pre-creates the row, or a returning applicant who
 * already has one, gets that existing row reused rather than a duplicate).
 * Case-insensitive lookup on purpose -- applications.email is stored exactly
 * as the applicant typed it, with no normalization, so an exact match would
 * miss anything that isn't byte-for-byte identical casing.
 */
async function findOrCreateMemberForApplication(
  supabase: ReturnType<typeof supabaseServer>,
  application: AcceptedApplication
) {
  const { data: existing } = await supabase
    .from("members")
    .select("id, full_name, email")
    .ilike("email", application.email)
    .maybeSingle();

  if (existing) return existing;

  // Only fields with a genuine 1:1 members-column equivalent are copied
  // over. `answers` also carries things like favorite genre or the
  // why-join essay -- application-specific context with no member-profile
  // column to land in -- so those are simply left out rather than force-fit
  // somewhere they don't belong; tier/bio/photo stay at the table's own
  // defaults ("member" tier, no bio, no photo) until the admin fills them in.
  const answers = application.answers ?? {};
  const socials: SocialsMap = {};
  if (application.instagram_handle) socials.instagram = application.instagram_handle;
  if (application.tiktok_handle) socials.tiktok = application.tiktok_handle;

  const { data: created, error } = await supabase
    .from("members")
    .insert({
      full_name: application.full_name,
      email: application.email,
      state: answers.state || null,
      socials,
    })
    .select("id, full_name, email")
    .single();

  if (error || !created) {
    console.error("[applications] Could not auto-create member for", application.email, error);
    return null;
  }

  return created;
}

async function provisionMemberAndSendPortalInvite(
  supabase: ReturnType<typeof supabaseServer>,
  application: AcceptedApplication
) {
  const member = await findOrCreateMemberForApplication(supabase, application);
  if (!member) return; // Already logged inside findOrCreateMemberForApplication.

  // Shared with the admin-triggered send/resend routes (see
  // lib/portalInvite.ts) -- token generation, the email attempt, and its
  // best-effort failure handling all live there now, not duplicated here.
  await issuePortalInvite(supabase, member);
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
    .select("kind, full_name, email, instagram_handle, tiktok_handle, answers")
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
    try {
      await provisionMemberAndSendPortalInvite(supabase, updated);
    } catch (err) {
      // The application is already marked accepted either way -- member
      // provisioning and the invite email are both best-effort add-ons.
      console.error("[applications] Member provisioning threw:", err);
    }
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
