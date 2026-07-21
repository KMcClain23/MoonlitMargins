import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionFromRequest } from "@/lib/adminAuth";

const respondSchema = z.object({
  action: z.enum(["accept", "propose", "approve_proposal", "reject_proposal"]),
  proposedDueDate: z.string().optional(),
  message: z.string().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = respondSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { action, proposedDueDate, message } = parsed.data;
  const supabase = supabaseServer();

  const { data: task } = await supabase
    .from("tasks")
    .select("id, assigned_to, assigned_by")
    .eq("id", id)
    .single();

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (action === "accept" || action === "propose") {
    // The assignee themselves (if logged in and linked to that member), or
    // an owner/admin acting on behalf of a member who has no login of
    // their own -- tasks can be assigned to roster members who never sign
    // into the backend at all.
    const isAssignee = session.memberId && session.memberId === task.assigned_to;
    const canActOnBehalf = session.role === "owner" || session.role === "admin";
    if (!isAssignee && !canActOnBehalf) {
      return NextResponse.json({ error: "Only the assignee (or an owner/admin) can respond to this task" }, { status: 403 });
    }

    if (action === "accept") {
      const { error } = await supabase
        .from("tasks")
        .update({ acceptance_status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) return NextResponse.json({ error: "Could not accept task" }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    // propose
    if (!proposedDueDate) {
      return NextResponse.json({ error: "A proposed date is required" }, { status: 400 });
    }
    const { error } = await supabase
      .from("tasks")
      .update({
        acceptance_status: "proposed_change",
        proposed_due_date: proposedDueDate,
        response_message: message || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: "Could not send proposal" }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // approve_proposal / reject_proposal -- only whoever assigned the task,
  // or an owner, can respond to a counter-proposal. The owner override is
  // for unblocking a stalled conversation between OTHER people -- it isn't
  // a way to approve your own counter-proposal just because you also hold
  // the owner role, so whoever actually IS the assignee (their own login,
  // not an on-behalf-of stand-in) is excluded from this path entirely.
  const isAssigner = session.adminUserId === task.assigned_by;
  const isActualAssignee = Boolean(session.memberId) && session.memberId === task.assigned_to;
  if (isActualAssignee || (!isAssigner && session.role !== "owner")) {
    return NextResponse.json(
      { error: "Only the assigner (or another owner) can respond to a proposal" },
      { status: 403 }
    );
  }

  if (action === "approve_proposal") {
    const { data: current } = await supabase.from("tasks").select("proposed_due_date").eq("id", id).single();
    const { error } = await supabase
      .from("tasks")
      .update({
        due_date: current?.proposed_due_date ?? null,
        proposed_due_date: null,
        acceptance_status: "accepted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: "Could not approve proposal" }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // reject_proposal: back to pending, so the assignee can accept the
  // original date or send a different proposal.
  const { error } = await supabase
    .from("tasks")
    .update({
      acceptance_status: "pending",
      proposed_due_date: null,
      response_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return NextResponse.json({ error: "Could not reject proposal" }, { status: 500 });
  return NextResponse.json({ success: true });
}
