import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SESSION_COOKIE, parseMemberSessionToken } from "@/lib/memberAuth";
import { getAssignedStepIds, applyStepAssignment } from "@/lib/orientationAssignments";
import OrientationChecklist from "@/components/portal/OrientationChecklist";

export const dynamic = "force-dynamic";

export default async function PortalOrientationPage() {
  const cookieStore = await cookies();
  const session = parseMemberSessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  // Middleware already guarantees a session for every /portal/* route
  // except login/setup -- this is just defense in depth, since the rest of
  // this page needs session.memberId to run its queries either way.
  if (!session) {
    redirect("/portal/login");
  }

  const supabase = supabaseServer();

  const [{ data: allSteps }, { data: progress }, { data: member }, assignedStepIds, { data: groupMeLinks }] =
    await Promise.all([
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
      supabase.from("orientation_groupme_links").select("id, label, url").order("sort_order", { ascending: true }),
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

  return (
    <OrientationChecklist
      steps={(steps ?? []).map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        completionType: s.completion_type as "member" | "admin",
        completed: completedStepIds.has(s.id as string),
      }))}
      mentorName={mentorName}
      completed={Boolean(member?.orientation_completed_at)}
      groupMeLinks={(groupMeLinks ?? []).map((l) => ({ id: l.id, label: l.label, url: l.url }))}
    />
  );
}
