import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberSessionFromRequest } from "@/lib/memberAuth";
import { getAssignedStepIds } from "@/lib/orientationAssignments";

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
  if (applicableStepIds.length > 0 && completedApplicableCount >= applicableStepIds.length) {
    await supabase
      .from("members")
      .update({ orientation_completed_at: new Date().toISOString() })
      .eq("id", session.memberId)
      .is("orientation_completed_at", null);
  }

  return NextResponse.json({ success: true });
}
