import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionFromRequest } from "@/lib/adminAuth";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
  completionType: z.enum(["member", "admin"]).optional(),
});

function requireOwner(request: NextRequest) {
  const session = getSessionFromRequest(request);
  return session?.role === "owner" ? session : null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireOwner(request)) {
    return NextResponse.json({ error: "Only the owner can manage orientation steps" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { title, description, sortOrder, completionType } = parsed.data;

  // Partial update -- the admin page uses this same endpoint both for
  // editing title/description/completionType and for the up/down reorder
  // buttons (which only ever send sortOrder), so only fields actually
  // present are touched.
  const update: Record<string, unknown> = {};
  if (title !== undefined) update.title = title;
  if (description !== undefined) update.description = description || null;
  if (sortOrder !== undefined) update.sort_order = sortOrder;
  if (completionType !== undefined) update.completion_type = completionType;

  const supabase = supabaseServer();
  const { error } = await supabase.from("orientation_steps").update(update).eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Could not update that step" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireOwner(request)) {
    return NextResponse.json({ error: "Only the owner can manage orientation steps" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = supabaseServer();

  // member_orientation_progress rows referencing this step have to go
  // first -- deleting a step out from under members who'd already checked
  // it off shouldn't leave orphaned progress rows (or fail outright if the
  // FK constraint has no cascade configured).
  await supabase.from("member_orientation_progress").delete().eq("orientation_step_id", id);

  const { error } = await supabase.from("orientation_steps").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Could not delete that step" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
