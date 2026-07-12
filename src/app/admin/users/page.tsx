import { supabaseServer } from "@/lib/supabase/server";
import GrantAccessForm from "@/components/admin/GrantAccessForm";
import UserRow from "@/components/admin/UserRow";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const supabase = supabaseServer();

  const { data: adminUsers } = await supabase
    .from("admin_users")
    .select("id, full_name, email, role, allowed_sections, member_id")
    .order("full_name", { ascending: true });

  const { data: members } = await supabase
    .from("members")
    .select("id, full_name")
    .order("full_name", { ascending: true });

  // Only offer members not already linked to an admin account, so the
  // owner can't accidentally link the same roster member to two different
  // logins.
  const linkedMemberIds = new Set((adminUsers ?? []).map((u) => u.member_id).filter(Boolean));
  const linkableMembers = (members ?? []).filter((m) => !linkedMemberIds.has(m.id));

  return (
    <div>
      <h1 className="font-voice text-3xl text-parchment">Users</h1>
      <p className="mt-1 text-sm text-muted">
        Backend login accounts. Optionally link one to a sisterhood member profile (like Kaya),
        or leave it unlinked for someone who isn't part of the public roster (like the site's
        developer).
      </p>

      <div className="mt-6">
        <GrantAccessForm members={linkableMembers} />
      </div>

      <div className="mt-8 space-y-3">
        {(adminUsers ?? []).length === 0 ? (
          <p className="text-sm text-muted">No admin accounts yet.</p>
        ) : (
          (adminUsers ?? []).map((user) => <UserRow key={user.id} user={user} />)
        )}
      </div>
    </div>
  );
}
