import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberSessionFromRequest } from "@/lib/memberAuth";
import { getAssignedStepIds } from "@/lib/orientationAssignments";
import { sendExpoPushToAdminUsers } from "@/lib/messaging";
import { sendOrientationCheckInEmail } from "@/lib/resend";

export async function POST(request: NextRequest, { params }: { params: Promise<{ stepId: string }> }) {
  const session = getMemberSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { stepId } = await params;
  const supabase = supabaseServer();

  const assignedStepIds = await getAssignedStepIds(supabase, session.memberId);

  // A member with any customization can only complete a step that's
  // actually part of it -- the checklist UI would never show them
  // anything else, but this guards against hitting the route directly.
  if (assignedStepIds.size > 0 && !assignedStepIds.has(stepId)) {
    return NextResponse.json({ error: "That step isn't part of your orientation." }, { status: 400 });
  }

  // Idempotent -- re-completing an already-completed step (e.g. a duplicate
  // click) is a no-op, not an error. The composite primary key on
  // member_orientation_progress would otherwise reject a duplicate insert.
  const { data: existing } = await supabase
    .from("member_orientation_progress")
    .select("member_id")
    .eq("member_id", session.memberId)
    .eq("orientation_step_id", stepId)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase
      .from("member_orientation_progress")
      .insert({ member_id: session.memberId, orientation_step_id: stepId });

    if (error) {
      return NextResponse.json({ error: "Could not mark that step complete" }, { status: 500 });
    }
  }

  // "All steps" means this member's applicable set -- their custom
  // assignment if they have one, otherwise every orientation_steps row.
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
    .eq("member_id", session.memberId);
  const completedIds = new Set((progressRows ?? []).map((r) => r.orientation_step_id as string));
  const completedApplicableCount = applicableStepIds.filter((id) => completedIds.has(id)).length;

  // Guarded with `.is(..., null)` rather than unconditionally setting this
  // on every call -- once orientation is already complete, re-hitting this
  // route for any reason must not keep pushing the completion date forward.
  // `.select()` on the update tells us whether a row actually matched (i.e.
  // this call is the one that JUST finished orientation) vs it having
  // already been complete -- the notification below must fire exactly
  // once, not on every subsequent idempotent call.
  let justCompleted: { full_name: string; mentor_admin_user_id: string | null } | null = null;
  if (applicableStepIds.length > 0 && completedApplicableCount >= applicableStepIds.length) {
    const { data: updated } = await supabase
      .from("members")
      .update({ orientation_completed_at: new Date().toISOString() })
      .eq("id", session.memberId)
      .is("orientation_completed_at", null)
      .select("full_name, mentor_admin_user_id")
      .maybeSingle();
    justCompleted = updated;
  }

  if (justCompleted) {
    await notifyMentorOfCompletion(supabase, session.memberId, justCompleted);
  }

  return NextResponse.json({ success: true });
}

/**
 * Reuses the exact same push + email primitives as the check-in route
 * (sendExpoPushToAdminUsers, sendOrientationCheckInEmail) rather than a
 * separate notification path -- the completion notice lands in the same
 * mentor_check_ins inbox as a regular check-in, just flagged
 * is_system_generated so the admin UI can render it differently.
 */
async function notifyMentorOfCompletion(
  supabase: ReturnType<typeof supabaseServer>,
  memberId: string,
  member: { full_name: string; mentor_admin_user_id: string | null }
) {
  if (!member.mentor_admin_user_id) {
    console.warn(
      `[portal/orientation/complete] ${member.full_name} (member ${memberId}) completed orientation with no assigned mentor -- no notification sent.`
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
      `[portal/orientation/complete] Mentor ${member.mentor_admin_user_id} not found for member ${memberId} -- no notification sent.`
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
    console.error("[portal/orientation/complete] Could not save completion notice:", insertError);
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
    console.error("[portal/orientation/complete] Email threw:", err);
  }
}
