import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { SESSION_COOKIE, parseSessionToken } from "@/lib/adminAuth";

const taskSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  dueDate: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = parseSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = taskSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { title, description, assignedTo, dueDate } = parsed.data;
  const supabase = supabaseServer();

  // assigned_by comes from the session, not the request body -- the person
  // creating a task is whoever is actually logged in (an admin_users
  // account), not whatever a client could claim.
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

  return NextResponse.json({ success: true });
}
