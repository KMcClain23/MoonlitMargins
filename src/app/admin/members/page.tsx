import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { SESSION_COOKIE, parseSessionToken } from "@/lib/adminAuth";
import MemberForm from "@/components/admin/MemberForm";
import MemberRow from "@/components/admin/MemberRow";
import BulkPortalInviteButton from "@/components/admin/BulkPortalInviteButton";

export const dynamic = "force-dynamic";

async function getMembersAndMentors() {
  const supabase = supabaseServer();
  const [{ data: members }, { data: adminUsers }, { data: orientationSteps }, { data: assignments }] =
    await Promise.all([
      supabase.from("members").select("*").order("display_order", { ascending: true }),
      supabase.from("admin_users").select("id, full_name").order("full_name", { ascending: true }),
      supabase.from("orientation_steps").select("id, title").order("sort_order", { ascending: true }),
      supabase.from("member_orientation_assignments").select("member_id, orientation_step_id"),
    ]);

  // Grouped once here rather than per-row -- each MemberRow just looks up
  // its own member_id, no per-row query needed.
  const assignedStepIdsByMember = new Map<string, string[]>();
  for (const row of assignments ?? []) {
    const list = assignedStepIdsByMember.get(row.member_id as string) ?? [];
    list.push(row.orientation_step_id as string);
    assignedStepIdsByMember.set(row.member_id as string, list);
  }

  return {
    members: members ?? [],
    mentorOptions: adminUsers ?? [],
    orientationSteps: orientationSteps ?? [],
    assignedStepIdsByMember,
  };
}

export default async function AdminMembersPage() {
  const { members, mentorOptions, orientationSteps, assignedStepIdsByMember } = await getMembersAndMentors();

  const cookieStore = await cookies();
  const session = parseSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  const eligibleForPortalInvite = members.filter((m) => !m.password_hash).length;

  return (
    <div>
      <h1 className="font-voice text-3xl text-parchment">Members</h1>

      <div className="mt-6">
        <MemberForm existingNames={members.map((m) => m.full_name)} />
      </div>

      {/* Bulk-inviting the whole roster is owner-only (see
          bulk-portal-invite/route.ts) -- hidden entirely for other admins
          rather than shown as a button that would just 403. Granting
          portal access via existing admin credentials lives on /admin/users
          instead (see SyncAdminPortalAccessButton there) -- that action is
          entirely about admin_users accounts, and most members here never
          have one, so this bulk-invite is the only path that applies to
          the roster as a whole. */}
      {session?.role === "owner" ? (
        <div className="mt-6">
          <BulkPortalInviteButton eligibleCount={eligibleForPortalInvite} />
        </div>
      ) : null}

      <div className="mt-8 space-y-3">
        {members.length === 0 ? (
          <p className="text-sm text-muted">No members added yet.</p>
        ) : (
          members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              mentorOptions={mentorOptions}
              orientationSteps={orientationSteps}
              assignedOrientationStepIds={assignedStepIdsByMember.get(member.id) ?? []}
            />
          ))
        )}
      </div>
    </div>
  );
}
