import type { supabaseServer } from "@/lib/supabase/server";
import { getAssignedStepIds } from "@/lib/orientationAssignments";
import { sendExpoPushToAdminUsers } from "@/lib/messaging";
import { sendOrientationCheckInEmail } from "@/lib/resend";

type SupabaseClient = ReturnType<typeof supabaseServer>;

/**
 * Shared tail of both orientation step-completion routes -- the member
 * self-service one (POST /api/portal/orientation/[stepId]/complete) and the
 * admin-marks-it-for-them one (POST
 * /api/admin/orientation/[memberId]/steps/[stepId]/complete). Both insert
 * their own member_orientation_progress row first (the two differ only in
 * whether completed_by_admin_user_id is set), then call this: it checks
 * whether that was the member's last applicable step and, if so, sets
 * orientation_completed_at and notifies their mentor -- exactly once, never
 * on a step completion that doesn't finish the checklist or a redundant
 * idempotent re-completion. Kept as one function so this logic (and the
 * notification it triggers) can never drift between the two call sites.
 */
export async function maybeCompleteOrientation(supabase: SupabaseClient, memberId: string): Promise<void> {
  // "All steps" means this member's applicable set -- their custom
  // assignment if they have one, otherwise every orientation_steps row.
  const assignedStepIds = await getAssignedStepIds(supabase, memberId);

  let applicableStepIds: string[];
  if (assignedStepIds.size > 0) {
    applicableStepIds = Array.from(assignedStepIds);
  } else {
    const { data: allSteps } = await supabase.from("orientation_steps").select("id");
    applicableStepIds = (allSteps ?? []).map((s) => s.id as string);
  }

  // Intersected with the applicable set, not a raw count of every progress
  // row -- if an admin narrows someone's assignment after they'd already
  // completed steps outside the new subset, those old completions must not
  // count toward finishing the (now smaller) checklist they actually have.
  const { data: progressRows } = await supabase
    .from("member_orientation_progress")
    .select("orientation_step_id")
    .eq("member_id", memberId);
  const completedIds = new Set((progressRows ?? []).map((r) => r.orientation_step_id as string));
  const completedApplicableCount = applicableStepIds.filter((id) => completedIds.has(id)).length;

  if (applicableStepIds.length === 0 || completedApplicableCount < applicableStepIds.length) {
    return;
  }

  // Guarded with `.is(..., null)` rather than unconditionally setting this
  // on every call -- once orientation is already complete, re-hitting
  // either completion route for any reason must not keep pushing the
  // completion date forward. `.select()` on the update tells us whether a
  // row actually matched (i.e. this call is the one that JUST finished
  // orientation) vs it having already been complete -- the notification
  // below must fire exactly once, not on every subsequent idempotent call.
  const { data: justCompleted } = await supabase
    .from("members")
    .update({ orientation_completed_at: new Date().toISOString() })
    .eq("id", memberId)
    .is("orientation_completed_at", null)
    .select("full_name, mentor_admin_user_id")
    .maybeSingle();

  if (justCompleted) {
    await notifyMentorOfCompletion(supabase, memberId, justCompleted);
  }
}

/**
 * Reuses the exact same push + email primitives as the orientation check-in
 * route (sendExpoPushToAdminUsers, sendOrientationCheckInEmail) rather than
 * a separate notification path -- the completion notice lands in the same
 * mentor_check_ins inbox as a regular check-in, just flagged
 * is_system_generated so the admin UI can render it differently.
 */
async function notifyMentorOfCompletion(
  supabase: SupabaseClient,
  memberId: string,
  member: { full_name: string; mentor_admin_user_id: string | null }
) {
  if (!member.mentor_admin_user_id) {
    console.warn(
      `[orientationCompletion] ${member.full_name} (member ${memberId}) completed orientation with no assigned mentor -- no notification sent.`
    );
    return;
  }

  const { data: mentor } = await supabase
    .from("admin_users")
    .select("id, full_name, email")
    .eq("id", member.mentor_admin_user_id)
    .maybeSingle();

  if (!mentor) {
    console.error(
      `[orientationCompletion] Mentor ${member.mentor_admin_user_id} not found for member ${memberId} -- no notification sent.`
    );
    return;
  }

  const message = `🎉 ${member.full_name} has completed orientation!`;

  // Same durable-record-first pattern as the check-in route -- this is the
  // one thing that stands between a completion and it being lost outright,
  // so it's written before either notification is attempted. Best-effort:
  // a failure here shouldn't fail the request (orientation_completed_at is
  // already saved either way), just logged.
  const { error: insertError } = await supabase.from("mentor_check_ins").insert({
    member_id: memberId,
    mentor_admin_user_id: mentor.id,
    message,
    is_system_generated: true,
  });
  if (insertError) {
    console.error("[orientationCompletion] Could not save completion notice:", insertError);
  }

  // sendExpoPushToAdminUsers already swallows its own failures internally
  // -- see its doc comment in messaging.ts.
  await sendExpoPushToAdminUsers(supabase, [mentor.id as string], {
    title: `${member.full_name} completed orientation`,
    body: message,
    data: { kind: "orientation_completed", memberId },
  });

  try {
    await sendOrientationCheckInEmail({
      recipientEmail: mentor.email as string,
      mentorName: mentor.full_name as string,
      memberName: member.full_name,
      message,
    });
  } catch (err) {
    console.error("[orientationCompletion] Email threw:", err);
  }
}
