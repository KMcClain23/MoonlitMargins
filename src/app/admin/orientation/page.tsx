import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SESSION_COOKIE, parseSessionToken } from "@/lib/adminAuth";
import { computeOrientationProgress, applyStepAssignment } from "@/lib/orientationAssignments";
import OrientationStepForm from "@/components/admin/OrientationStepForm";
import OrientationStepsList from "@/components/admin/OrientationStepsList";
import MentorAssignmentSelect from "@/components/admin/MentorAssignmentSelect";
import AdminOrientationStepCompleteButton from "@/components/admin/AdminOrientationStepCompleteButton";
import OrientationGroupMeLinkForm from "@/components/admin/OrientationGroupMeLinkForm";
import OrientationGroupMeLinksList from "@/components/admin/OrientationGroupMeLinksList";

export const dynamic = "force-dynamic";

async function getOrientationData() {
  const supabase = supabaseServer();

  const [{ data: steps }, { data: inProgressMembers }, { data: adminUsers }, { data: groupMeLinks }] = await Promise.all([
    supabase
      .from("orientation_steps")
      .select("id, title, description, sort_order, completion_type")
      .order("sort_order", { ascending: true }),
    supabase
      .from("members")
      .select("id, full_name, mentor_admin_user_id")
      .is("orientation_completed_at", null)
      .order("full_name", { ascending: true }),
    supabase.from("admin_users").select("id, full_name").order("full_name", { ascending: true }),
    supabase.from("orientation_groupme_links").select("id, label, url, sort_order").order("sort_order", { ascending: true }),
  ]);

  const memberIds = (inProgressMembers ?? []).map((m) => m.id as string);
  const allStepIds = (steps ?? []).map((s) => s.id as string);

  const [{ data: assignments }, { data: progress }] =
    memberIds.length > 0
      ? await Promise.all([
          supabase.from("member_orientation_assignments").select("member_id, orientation_step_id").in("member_id", memberIds),
          supabase.from("member_orientation_progress").select("member_id, orientation_step_id").in("member_id", memberIds),
        ])
      : [{ data: [] }, { data: [] }];

  const assignedByMember = new Map<string, Set<string>>();
  for (const row of assignments ?? []) {
    const set = assignedByMember.get(row.member_id as string) ?? new Set<string>();
    set.add(row.orientation_step_id as string);
    assignedByMember.set(row.member_id as string, set);
  }

  const completedByMember = new Map<string, Set<string>>();
  for (const row of progress ?? []) {
    const set = completedByMember.get(row.member_id as string) ?? new Set<string>();
    set.add(row.orientation_step_id as string);
    completedByMember.set(row.member_id as string, set);
  }

  const membersInProgress = (inProgressMembers ?? []).map((member) => {
    const assignedStepIds = assignedByMember.get(member.id as string) ?? new Set<string>();
    const completedStepIds = completedByMember.get(member.id as string) ?? new Set<string>();

    // This member's applicable step list (their custom assignment if they
    // have one, otherwise every step), each flagged with whether THEY'VE
    // completed it -- what the per-step rows below actually render, not
    // just the completed/total summary count.
    const applicableSteps = applyStepAssignment(steps ?? [], assignedStepIds).map((step) => ({
      id: step.id as string,
      title: step.title as string,
      completionType: step.completion_type as "member" | "admin",
      completed: completedStepIds.has(step.id as string),
    }));

    return {
      id: member.id as string,
      fullName: member.full_name as string,
      mentorAdminUserId: member.mentor_admin_user_id as string | null,
      steps: applicableSteps,
      ...computeOrientationProgress(allStepIds, assignedStepIds, completedStepIds),
    };
  });

  // Full history, not scoped to any one mentor -- this page is owner-only,
  // so unlike GET /api/admin/mentor-check-ins's default (the viewing
  // admin's own check-ins), there's no reason to filter here at all.
  const { data: checkInRows } = await supabase
    .from("mentor_check_ins")
    .select("id, member_id, message, read_at, created_at, is_system_generated")
    .order("created_at", { ascending: false });

  const checkInMemberIds = Array.from(new Set((checkInRows ?? []).map((c) => c.member_id as string)));
  const { data: checkInMembers } =
    checkInMemberIds.length > 0
      ? await supabase.from("members").select("id, full_name, orientation_completed_at").in("id", checkInMemberIds)
      : { data: [] };
  const checkInMemberById = new Map((checkInMembers ?? []).map((m) => [m.id as string, m]));

  const checkIns = (checkInRows ?? []).map((c) => {
    const member = checkInMemberById.get(c.member_id as string);
    return {
      id: c.id as string,
      memberId: c.member_id as string,
      memberName: member?.full_name ?? "Unknown",
      memberCompleted: Boolean(member?.orientation_completed_at),
      message: c.message as string,
      readAt: c.read_at as string | null,
      createdAt: c.created_at as string,
      isSystemGenerated: c.is_system_generated as boolean,
    };
  });

  return {
    steps: steps ?? [],
    membersInProgress,
    mentorOptions: adminUsers ?? [],
    checkIns,
    groupMeLinks: (groupMeLinks ?? []).map((l) => ({
      id: l.id as string,
      label: l.label as string,
      url: l.url as string,
      sort_order: l.sort_order as number,
    })),
  };
}

function formatCheckInTime(createdAt: string): string {
  return new Date(createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AdminOrientationPage() {
  const cookieStore = await cookies();
  const session = parseSessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  // Matches the old /admin/orientation-steps gate exactly (and the
  // AdminNav link pointing here, itself already owner-only) -- mentor
  // assignment moving onto this page means it's now owner-only too,
  // narrower than MemberForm's previous "any admin with Members access"
  // reach.
  if (session?.role !== "owner") {
    redirect("/admin/applications");
  }

  const { steps, membersInProgress, mentorOptions, checkIns, groupMeLinks } = await getOrientationData();

  return (
    <div>
      <h1 className="font-voice text-3xl text-parchment">Orientation</h1>
      <p className="mt-1 text-sm text-muted">
        Step content, who&rsquo;s still onboarding and their mentor, and the check-in/completion history --
        all in one place.
      </p>

      <section id="steps" className="mt-10">
        <h2 className="font-voice text-xl text-parchment">Steps</h2>
        <p className="mt-1 text-sm text-muted">
          Shown to every member in the portal checklist, in this order, until they&rsquo;ve checked off all
          of them (or their own custom subset -- see each member&rsquo;s Orientation field on{" "}
          <Link href="/admin/members" className="text-lilac-soft hover:underline">
            /admin/members
          </Link>
          ).
        </p>

        <div className="mt-4">
          <OrientationStepForm />
        </div>

        <div className="mt-6">
          <OrientationStepsList steps={steps} />
        </div>
      </section>

      <section id="groupme-links" className="mt-12">
        <h2 className="font-voice text-xl text-parchment">GroupMe links</h2>
        <p className="mt-1 text-sm text-muted">
          Shown to every member on the portal Orientation page as a &ldquo;Join our GroupMe chats&rdquo;
          list, in this order.
        </p>

        <div className="mt-4">
          <OrientationGroupMeLinkForm />
        </div>

        <div className="mt-6">
          <OrientationGroupMeLinksList links={groupMeLinks} />
        </div>
      </section>

      <section id="members-in-progress" className="mt-12">
        <h2 className="font-voice text-xl text-parchment">Members in progress</h2>
        <p className="mt-1 text-sm text-muted">
          Everyone who hasn&rsquo;t finished orientation yet. Completed members drop off this list.
        </p>

        <div className="mt-4 space-y-3">
          {membersInProgress.length === 0 ? (
            <p className="text-sm text-muted">Nobody&rsquo;s currently onboarding.</p>
          ) : (
            membersInProgress.map((member) => (
              <div
                key={member.id}
                id={`member-${member.id}`}
                className="rounded-2xl border border-hairline bg-surface p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-parchment">{member.fullName}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {member.completed} of {member.total} step{member.total === 1 ? "" : "s"} complete
                    </p>
                  </div>
                  <MentorAssignmentSelect
                    memberId={member.id}
                    mentorAdminUserId={member.mentorAdminUserId}
                    mentorOptions={mentorOptions}
                  />
                </div>

                {/* Admin-type steps get a "Mark complete" button (any admin
                    can click, not just the assigned mentor) -- member-type
                    steps are read-only here, since the member does those
                    themselves in the portal checklist, not an admin on
                    their behalf. */}
                {member.steps.length > 0 ? (
                  <ul className="mt-3 space-y-1.5 border-t border-hairline pt-3">
                    {member.steps.map((step) => (
                      <li key={step.id} className="flex items-center justify-between gap-3 text-xs">
                        <span className={step.completed ? "text-muted line-through" : "text-parchment"}>
                          {step.title}
                        </span>
                        {step.completed ? (
                          <span className="shrink-0 text-lilac-soft">✓ Done</span>
                        ) : step.completionType === "admin" ? (
                          <AdminOrientationStepCompleteButton memberId={member.id} stepId={step.id} />
                        ) : (
                          <span className="shrink-0 text-muted">Self-completes</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>

      <section id="check-ins" className="mt-12">
        <h2 className="font-voice text-xl text-parchment">Check-ins</h2>
        <p className="mt-1 text-sm text-muted">
          Every personal check-in and automated completion notice, across every mentor.
        </p>

        <div className="mt-4 max-h-[32rem] space-y-2 overflow-y-auto rounded-2xl border border-hairline bg-surface p-3">
          {checkIns.length === 0 ? (
            <p className="p-2 text-sm text-muted">No check-ins yet.</p>
          ) : (
            checkIns.map((c) => (
              <div key={c.id} className="rounded-lg border border-hairline p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-parchment">
                    <span aria-hidden="true">{c.isSystemGenerated ? "🏆" : "💬"}</span>
                    <Link
                      href={c.memberCompleted ? `/admin/members#member-${c.memberId}` : `#member-${c.memberId}`}
                      className="hover:underline"
                    >
                      {c.memberName}
                    </Link>
                  </p>
                  {!c.readAt ? (
                    <span className="shrink-0 rounded-full bg-candle/20 px-2 py-0.5 text-[10px] text-candle-soft">
                      Unread
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted">{c.message}</p>
                <p className="mt-1 text-[10px] text-muted/70">{formatCheckInTime(c.createdAt)}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
