import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberSessionFromRequest } from "@/lib/memberAuth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ stepId: string }> }) {
  const session = getMemberSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { stepId } = await params;
  const supabase = supabaseServer();

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

  const { count: totalSteps } = await supabase
    .from("orientation_steps")
    .select("id", { count: "exact", head: true });

  const { count: completedSteps } = await supabase
    .from("member_orientation_progress")
    .select("orientation_step_id", { count: "exact", head: true })
    .eq("member_id", session.memberId);

  // Guarded with `.is(..., null)` rather than unconditionally setting this
  // on every call -- once orientation is already complete, re-hitting this
  // route for any reason must not keep pushing the completion date forward.
  if (totalSteps !== null && totalSteps > 0 && completedSteps !== null && completedSteps >= totalSteps) {
    await supabase
      .from("members")
      .update({ orientation_completed_at: new Date().toISOString() })
      .eq("id", session.memberId)
      .is("orientation_completed_at", null);
  }

  return NextResponse.json({ success: true });
}
