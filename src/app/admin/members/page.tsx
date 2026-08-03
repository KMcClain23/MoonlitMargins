import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { SESSION_COOKIE, parseSessionToken } from "@/lib/adminAuth";
import MemberForm from "@/components/admin/MemberForm";
import MemberRow from "@/components/admin/MemberRow";
import BulkPortalInviteButton from "@/components/admin/BulkPortalInviteButton";
import SyncAdminPortalAccessButton from "@/components/admin/SyncAdminPortalAccessButton";

export const dynamic = "force-dynamic";

async function getMembersAndMentors() {
  const supabase = supabaseServer();
  const [{ data: members }, { data: adminUsers }] = await Promise.all([
    supabase.from("members").select("*").order("display_order", { ascending: true }),
    supabase.from("admin_users").select("id, full_name, member_id").order("full_name", { ascending: true }),
  ]);
  return { members: members ?? [], mentorOptions: adminUsers ?? [] };
}

export default async function AdminMembersPage() {
  const { members, mentorOptions } = await getMembersAndMentors();

  const cookieStore = await cookies();
  const session = parseSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  const eligibleForPortalInvite = members.filter((m) => !m.password_hash).length;

  const memberIdsWithAdminAccess = new Set(mentorOptions.map((u) => u.member_id).filter(Boolean));
  const eligibleForAdminSync = members.filter(
    (m) => !m.password_hash && memberIdsWithAdminAccess.has(m.id)
  ).length;

  return (
    <div>
      <h1 className="font-voice text-3xl text-parchment">Members</h1>

      <div className="mt-6">
        <MemberForm existingNames={members.map((m) => m.full_name)} />
      </div>

      {/* Bulk-inviting the whole roster is owner-only (see
          bulk-portal-invite/route.ts) -- hidden entirely for other admins
          rather than shown as a button that would just 403. */}
      {session?.role === "owner" ? (
        <div className="mt-6 space-y-4">
          <SyncAdminPortalAccessButton eligibleCount={eligibleForAdminSync} />
          <BulkPortalInviteButton eligibleCount={eligibleForPortalInvite} />
        </div>
      ) : null}

      <div className="mt-8 space-y-3">
        {members.length === 0 ? (
          <p className="text-sm text-muted">No members added yet.</p>
        ) : (
          members.map((member) => (
            <MemberRow key={member.id} member={member} mentorOptions={mentorOptions} />
          ))
        )}
      </div>
    </div>
  );
}
