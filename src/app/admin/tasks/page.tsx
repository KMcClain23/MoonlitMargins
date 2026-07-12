import { supabaseServer } from "@/lib/supabase/server";
import TaskForm from "@/components/admin/TaskForm";
import TaskRow from "@/components/admin/TaskRow";

export const dynamic = "force-dynamic";

export default async function AdminTasksPage() {
  const supabase = supabaseServer();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, description, assigned_to, assigned_by, due_date, status, created_at")
    .order("due_date", { ascending: true, nullsFirst: false });

  const { data: members } = await supabase
    .from("members")
    .select("id, full_name")
    .order("full_name", { ascending: true });

  const { data: adminUsers } = await supabase.from("admin_users").select("id, full_name");

  // Resolved client-side rather than via Postgres foreign-key embeds --
  // assigned_to points at members, assigned_by points at admin_users (two
  // different tables), so this is simpler and more robust than trying to
  // disambiguate embedded joins across both.
  const memberNames = new Map((members ?? []).map((m) => [m.id, m.full_name]));
  const adminUserNames = new Map((adminUsers ?? []).map((u) => [u.id, u.full_name]));

  return (
    <div>
      <h1 className="font-voice text-3xl text-parchment">Tasks</h1>

      <div className="mt-6">
        <TaskForm members={members ?? []} />
      </div>

      <div className="mt-8 space-y-3">
        {(tasks ?? []).length === 0 ? (
          <p className="text-sm text-muted">No tasks yet.</p>
        ) : (
          (tasks ?? []).map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              assigneeName={task.assigned_to ? memberNames.get(task.assigned_to) ?? "Unknown" : null}
              assignerName={adminUserNames.get(task.assigned_by) ?? "Unknown"}
              members={members ?? []}
            />
          ))
        )}
      </div>
    </div>
  );
}
