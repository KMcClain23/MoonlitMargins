import { supabaseServer } from "@/lib/supabase/server";
import MemberForm from "@/components/admin/MemberForm";
import MemberRow from "@/components/admin/MemberRow";

export const dynamic = "force-dynamic";

async function getMembers() {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("members")
    .select("*")
    .order("display_order", { ascending: true });
  return data ?? [];
}

export default async function AdminMembersPage() {
  const members = await getMembers();

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
          members.map((member) => <MemberRow key={member.id} member={member} />)
        )}
      </div>
    </div>
  );
}
