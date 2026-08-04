import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionFromRequest } from "@/lib/adminAuth";
import { getAssignedStepIds } from "@/lib/orientationAssignments";
import { maybeCompleteOrientation } from "@/lib/orientationCompletion";

/**
 * Counterpart to POST /api/portal/orientation/[stepId]/complete, for
 * "admin marks it complete" steps (completion_type = "admin") -- things a
 * member can't self-certify (e.g. paperwork an admin has to verify). Any
 * authenticated admin can call this, not just the member's assigned
 * mentor -- orientation-steps management itself is owner-only, but
 * actually marking a step complete for someone is routine day-to-day
 * admin work, not a permission this app restricts further.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; stepId: string }> }
) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { memberId, stepId } = await params;
  const supabase = supabaseServer();

  // The counterpart guard to the member route's own admin-type check --
  // this route is only for steps a member can't self-complete. A
  // member-type step never gets a "Mark complete" button in the admin UI
  // (see the Members in Progress section), but a direct API call should
  // still be turned away rather than silently letting an admin bypass
  // "member does this themselves."
  const { data: step } = await supabase.from("orientation_steps").select("completion_type").eq("id", stepId).maybeSingle();
  if (step?.completion_type !== "admin") {
    return NextResponse.json({ error: "That step isn't admin-completable." }, { status: 400 });
  }

  const assignedStepIds = await getAssignedStepIds(supabase, memberId);
  if (assignedStepIds.size > 0 && !assignedStepIds.has(stepId)) {
    return NextResponse.json({ error: "That step isn't part of this member's orientation." }, { status: 400 });
  }

  // Idempotent, same reasoning as the member route: a duplicate click (or
  // two admins racing each other) is a no-op, not an error, and doesn't
  // overwrite who originally completed it.
  const { data: existing } = await supabase
    .from("member_orientation_progress")
    .select("member_id")
    .eq("member_id", memberId)
    .eq("orientation_step_id", stepId)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from("member_orientation_progress").insert({
      member_id: memberId,
      orientation_step_id: stepId,
      completed_by_admin_user_id: session.adminUserId,
    });

    if (error) {
      return NextResponse.json({ error: "Could not mark that step complete" }, { status: 500 });
    }
  }

  await maybeCompleteOrientation(supabase, memberId);

  return NextResponse.json({ success: true });
}
