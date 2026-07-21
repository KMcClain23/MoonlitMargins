import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionFromRequest } from "@/lib/adminAuth";

const taskSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  assignToGroup: z.enum(["all", "leadership"]).optional(),
  dueDate: z.string().optional(),
});

// Mirrors the three queries src/app/admin/tasks/page.tsx runs directly
// against Supabase (server component, no API route needed there) -- the
// mobile app has no equivalent way to do that, so this is its one real
// GET endpoint for the task list. Session's memberId/canAssignTasks are
// already returned from login and cached client-side, so they're
// deliberately not repeated here.
export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

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

  // Members who have their own admin_users login -- see the same comment
  // in page.tsx: an owner/admin can only act "on behalf of" someone who
  // has NO login of their own.
  const membersWithLogin = new Set((adminUsers ?? []).map((u) => u.member_id).filter(Boolean));

  return NextResponse.json({
    tasks: (tasks ?? []).map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      assignedTo: task.assigned_to,
      assignedBy: task.assigned_by,
      dueDate: task.due_date,
      status: task.status,
      acceptanceStatus: task.acceptance_status,
      proposedDueDate: task.proposed_due_date,
      responseMessage: task.response_message,
      createdAt: task.created_at,
      assigneeName: task.assigned_to ? memberNames.get(task.assigned_to) ?? "Unknown" : null,
      assigneeHasLogin: task.assigned_to ? membersWithLogin.has(task.assigned_to) : false,
      assignerName: adminUserNames.get(task.assigned_by) ?? "Unknown",
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!session.canAssignTasks) {
    return NextResponse.json({ error: "You don't have permission to create tasks" }, { status: 403 });
  }

  const parsed = taskSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { title, description, assignedTo, assignToGroup, dueDate } = parsed.data;
  const supabase = supabaseServer();

  // "Everyone"/"Leadership" fan out into one independent task per matching
  // roster member, rather than a single task with multiple assignees --
  // each person gets their own row to accept, propose a different date
  // for, and track to completion, instead of one shared task where any
  // one person's status change would affect everyone else's.
  if (assignToGroup) {
    let membersQuery = supabase.from("members").select("id");
    if (assignToGroup === "leadership") {
      membersQuery = membersQuery.eq("is_leadership", true);
    }
    const { data: recipients, error: membersError } = await membersQuery;

    if (membersError) {
      return NextResponse.json({ error: "Could not look up recipients" }, { status: 500 });
    }
    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: "No matching members to assign this to" }, { status: 400 });
    }

    const { error } = await supabase.from("tasks").insert(
      recipients.map((m) => ({
        title,
        description: description || null,
        assigned_to: m.id,
        assigned_by: session.adminUserId,
        due_date: dueDate || null,
      }))
    );

    if (error) {
      return NextResponse.json({ error: "Could not create tasks" }, { status: 500 });
    }

    return NextResponse.json({ success: true, createdCount: recipients.length });
  }

  const { error } = await supabase.from("tasks").insert({
    title,
    description: description || null,
    assigned_to: assignedTo || null,
    assigned_by: session.adminUserId,
    due_date: dueDate || null,
  });

  if (error) {
    return NextResponse.json({ error: "Could not create task" }, { status: 500 });
  }

  return NextResponse.json({ success: true, createdCount: 1 });
}
