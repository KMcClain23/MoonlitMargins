import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { SESSION_COOKIE, parseSessionToken } from "@/lib/adminAuth";
import TaskForm from "@/components/admin/TaskForm";
import TaskRow from "@/components/admin/TaskRow";

export const dynamic = "force-dynamic";

export default async function AdminTasksPage() {
  const cookieStore = await cookies();
  const session = parseSessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  const supabase = supabaseServer();

  const { data: tasks } = await supabase
    .from("tasks")
    .select(
      "id, title, description, assigned_to, assigned_by, due_date, status, acceptance_status, proposed_due_date, response_message, created_at"
    )
    .order("due_date", { ascending: true, nullsFirst: false });

  const { data: members } = await supabase
    .from("members")
    .select("id, full_name")
    .order("full_name", { ascending: true });

  const { data: adminUsers } = await supabase.from("admin_users").select("id, full_name, member_id");

  const memberNames = new Map((members ?? []).map((m) => [m.id, m.full_name]));
  const adminUserNames = new Map((adminUsers ?? []).map((u) => [u.id, u.full_name]));

  // Members who have their own admin_users login -- an owner/admin should
  // only be able to accept/propose "on behalf of" someone who has NO way
  // to respond themselves. If the assignee has their own account, they
  // (and only they) should handle their own task.
  const membersWithLogin = new Set((adminUsers ?? []).map((u) => u.member_id).filter(Boolean));

  return (
    <div>
      <h1 className="font-voice text-3xl text-parchment">Tasks</h1>

      {session?.canAssignTasks ? (
        <div className="mt-6">
          <TaskForm members={members ?? []} />
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">
          You can view and respond to tasks assigned to you, but can&rsquo;t create or reassign
          tasks.
        </p>
      )}

      <div className="mt-8 space-y-3">
        {(tasks ?? []).length === 0 ? (
          <p className="text-sm text-muted">No tasks yet.</p>
        ) : (
          (tasks ?? []).map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              assigneeName={task.assigned_to ? memberNames.get(task.assigned_to) ?? "Unknown" : null}
              assigneeHasLogin={task.assigned_to ? membersWithLogin.has(task.assigned_to) : false}
              assignerName={adminUserNames.get(task.assigned_by) ?? "Unknown"}
              members={members ?? []}
              currentUser={
                session
                  ? {
                      adminUserId: session.adminUserId,
                      memberId: session.memberId,
                      role: session.role,
                      canAssignTasks: session.canAssignTasks,
                    }
                  : null
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
