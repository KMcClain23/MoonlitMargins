import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { SESSION_COOKIE, parseSessionToken } from "@/lib/adminAuth";

const updateSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  dueDate: z.string().optional(),
  status: z.enum(["todo", "in_progress", "done"]),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = parseSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { title, description, assignedTo, dueDate, status } = parsed.data;
  const supabase = supabaseServer();

  const { data: current } = await supabase.from("tasks").select("assigned_to").eq("id", id).single();
  const newAssignedTo = assignedTo || null;
  const isReassignment = current && current.assigned_to !== newAssignedTo;

  const update: Record<string, unknown> = {
    title,
    description: description || null,
    assigned_to: newAssignedTo,
    due_date: dueDate || null,
    status,
    updated_at: new Date().toISOString(),
  };

  // A new assignee never inherits the previous person's acceptance --
  // start fresh so they get their own chance to accept or propose a
  // different date, rather than the task silently staying "accepted" (or
  // showing someone else's proposal) for a person who never saw it.
  if (isReassignment) {
    update.acceptance_status = "pending";
    update.proposed_due_date = null;
    update.response_message = null;
  }

  const { error } = await supabase.from("tasks").update(update).eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Could not update task" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = parseSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = supabaseServer();
  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Could not delete task" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
