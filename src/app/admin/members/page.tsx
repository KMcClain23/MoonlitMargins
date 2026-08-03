import { supabaseServer } from "@/lib/supabase/server";
import MemberForm from "@/components/admin/MemberForm";
import MemberRow from "@/components/admin/MemberRow";

export const dynamic = "force-dynamic";

async function getMembersAndMentors() {
  const supabase = supabaseServer();
  const [{ data: members }, { data: adminUsers }] = await Promise.all([
    supabase.from("members").select("*").order("display_order", { ascending: true }),
    supabase.from("admin_users").select("id, full_name").order("full_name", { ascending: true }),
  ]);
  return { members: members ?? [], mentorOptions: adminUsers ?? [] };
}

export default async function AdminMembersPage() {
  const { members, mentorOptions } = await getMembersAndMentors();

  return (
    <div>
      <h1 className="font-voice text-3xl text-parchment">Members</h1>

      <div className="mt-6">
        <MemberForm existingNames={members.map((m) => m.full_name)} />
      </div>

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
