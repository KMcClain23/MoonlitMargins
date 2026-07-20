import { supabaseServer } from "@/lib/supabase/server";
import GrantAccessForm from "@/components/admin/GrantAccessForm";
import UserRow from "@/components/admin/UserRow";
import BulkProvisionButton from "@/components/admin/BulkProvisionButton";
import UserRoleFilter from "@/components/admin/UserRoleFilter";
import type { AdminRole } from "@/lib/adminSections";

export const dynamic = "force-dynamic";

const VALID_ROLES: AdminRole[] = ["owner", "admin", "editor"];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role: roleParam } = await searchParams;
  const role = VALID_ROLES.includes(roleParam as AdminRole) ? (roleParam as AdminRole) : "all";

  const supabase = supabaseServer();

  // Independent queries -- run them concurrently instead of one after the
  // other, since neither depends on the other's result.
  const [{ data: adminUsers }, { data: members }] = await Promise.all([
    supabase
      .from("admin_users")
      .select("id, full_name, email, role, allowed_sections, member_id")
      .order("full_name", { ascending: true }),
    supabase.from("members").select("id, full_name, email").order("full_name", { ascending: true }),
  ]);

  const linkedMemberIds = new Set((adminUsers ?? []).map((u) => u.member_id).filter(Boolean));
  const linkableMembers = (members ?? []).filter((m) => !linkedMemberIds.has(m.id));
  const eligibleForBulk = linkableMembers.filter((m) => m.email).length;

  const visibleUsers = (adminUsers ?? []).filter((u) => role === "all" || u.role === role);

  return (
    <div>
      <h1 className="font-voice text-3xl text-parchment">Users</h1>
      <p className="mt-1 text-sm text-muted">
        Backend login accounts. Optionally link one to a sisterhood member profile (like Kaya),
        or leave it unlinked for someone who isn't part of the public roster (like the site's
        developer).
      </p>

      <div className="mt-6">
        <BulkProvisionButton eligibleCount={eligibleForBulk} />
      </div>

      <div className="mt-6">
        <GrantAccessForm members={linkableMembers} />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <p className="text-sm text-muted">
          {visibleUsers.length} account{visibleUsers.length === 1 ? "" : "s"}
        </p>
        <UserRoleFilter value={role} />
      </div>

      <div className="mt-3 space-y-3">
        {visibleUsers.length === 0 ? (
          <p className="text-sm text-muted">
            {(adminUsers ?? []).length === 0 ? "No admin accounts yet." : "No accounts with this role."}
          </p>
        ) : (
          visibleUsers.map((user) => <UserRow key={user.id} user={user} />)
        )}
      </div>
    </div>
  );
}
