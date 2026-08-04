import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberSessionFromRequest, memberSessionHasAdminSection } from "@/lib/memberAuth";
import { getAssignedStepIds } from "@/lib/orientationAssignments";
import { maybeCompleteOrientation } from "@/lib/orientationCompletion";

export async function POST(request: NextRequest, { params }: { params: Promise<{ stepId: string }> }) {
  const session = getMemberSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!memberSessionHasAdminSection(session, "member_orientation")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { stepId } = await params;
  const supabase = supabaseServer();

  // Admin-type steps ("admin marks it complete") are the counterpart to
  // this route -- see POST /api/admin/orientation/[memberId]/steps/[stepId]/
  // complete. A member hitting this route directly for one of those must
  // not be able to self-complete it just because they know the step id.
  const { data: step } = await supabase.from("orientation_steps").select("completion_type").eq("id", stepId).maybeSingle();
  if (step?.completion_type === "admin") {
    return NextResponse.json({ error: "This step is completed by an admin, not by you." }, { status: 403 });
  }

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

  await maybeCompleteOrientation(supabase, session.memberId);

  return NextResponse.json({ success: true });
}
