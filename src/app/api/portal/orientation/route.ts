import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberSessionFromRequest, memberSessionHasAdminSection } from "@/lib/memberAuth";
import { getAssignedStepIds, applyStepAssignment } from "@/lib/orientationAssignments";

export async function GET(request: NextRequest) {
  const session = getMemberSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!memberSessionHasAdminSection(session, "member_orientation")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = supabaseServer();

  const [{ data: allSteps }, { data: progress }, { data: member }, assignedStepIds] = await Promise.all([
    supabase
      .from("orientation_steps")
      .select("id, title, description, completion_type")
      .order("sort_order", { ascending: true }),
    supabase
      .from("member_orientation_progress")
      .select("orientation_step_id")
      .eq("member_id", session.memberId),
    supabase
      .from("members")
      .select("orientation_completed_at, mentor_admin_user_id")
      .eq("id", session.memberId)
      .maybeSingle(),
    getAssignedStepIds(supabase, session.memberId),
  ]);

  const steps = applyStepAssignment(allSteps ?? [], assignedStepIds);
  const completedStepIds = new Set((progress ?? []).map((p) => p.orientation_step_id as string));

  let mentorName: string | null = null;
  if (member?.mentor_admin_user_id) {
    const { data: mentor } = await supabase
      .from("admin_users")
      .select("full_name")
      .eq("id", member.mentor_admin_user_id)
      .maybeSingle();
    mentorName = mentor?.full_name ?? null;
  }

  return NextResponse.json({
    steps: steps.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      // Not consumed by the web portal page (it queries the DB directly,
      // not this route) -- included here for the mobile app's identical
      // checklist, which fetches this endpoint. Additive field; harmless
      // for any client not yet reading it.
      completionType: s.completion_type,
      completed: completedStepIds.has(s.id as string),
    })),
    mentorName,
    orientationCompletedAt: member?.orientation_completed_at ?? null,
  });
}
