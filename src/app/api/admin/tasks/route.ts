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
