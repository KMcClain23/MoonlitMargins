import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberSessionFromRequest } from "@/lib/memberAuth";

export async function GET(request: NextRequest) {
  const session = getMemberSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = supabaseServer();

  const [{ data: steps }, { data: progress }, { data: member }] = await Promise.all([
    supabase
      .from("orientation_steps")
      .select("id, title, description")
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
  ]);

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
    steps: (steps ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      completed: completedStepIds.has(s.id as string),
    })),
    mentorName,
    orientationCompletedAt: member?.orientation_completed_at ?? null,
  });
}
