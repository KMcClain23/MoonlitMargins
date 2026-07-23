import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionFromRequest } from "@/lib/adminAuth";

const patchSchema = z
  .object({
    muted: z.boolean().optional(),
    read: z.boolean().optional(),
  })
  .refine((data) => data.muted !== undefined || data.read !== undefined, {
    message: "Provide at least one of muted or read",
  });

async function requireParticipant(supabase: ReturnType<typeof supabaseServer>, conversationId: string, adminUserId: string) {
  const { data } = await supabase
    .from("conversation_participants")
    .select("admin_user_id")
    .eq("conversation_id", conversationId)
    .eq("admin_user_id", adminUserId)
    .maybeSingle();
  return Boolean(data);
}

// Updates the requester's own conversation_participants row -- muted
// (suppresses push only, per the comment on that column's usage in
// sendMessageAndNotify) and/or read (last_read_at) are both optional and
// independent; a request can change either, both, or -- since at least
// one must be present -- never neither.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    // The "at least one of muted/read" check is a whole-body refine (no
    // single field it belongs to), so it lands in formErrors rather than
    // fieldErrors -- return the full flatten() rather than just
    // fieldErrors, or that message would silently disappear.
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = supabaseServer();

  if (!(await requireParticipant(supabase, id, session.adminUserId))) {
    return NextResponse.json({ error: "Not a participant of this conversation" }, { status: 403 });
  }

  const { muted, read } = parsed.data;
  const updates: { muted?: boolean; last_read_at?: string | null } = {};
  if (muted !== undefined) updates.muted = muted;
  if (read !== undefined) updates.last_read_at = read ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("conversation_participants")
    .update(updates)
    .eq("conversation_id", id)
    .eq("admin_user_id", session.adminUserId);

  if (error) {
    return NextResponse.json({ error: "Could not update conversation" }, { status: 500 });
  }

  return NextResponse.json({ success: true, ...parsed.data });
}

// "Leave conversation" -- removes only the requester's own participant
// row. The conversation, its messages, and every other participant are
// left completely untouched; this is not a delete of the thread itself.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = supabaseServer();

  const { data: conversation } = await supabase.from("conversations").select("id").eq("id", id).maybeSingle();
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  if (!(await requireParticipant(supabase, id, session.adminUserId))) {
    return NextResponse.json({ error: "Not a participant of this conversation" }, { status: 403 });
  }

  const { error } = await supabase
    .from("conversation_participants")
    .delete()
    .eq("conversation_id", id)
    .eq("admin_user_id", session.adminUserId);

  if (error) {
    return NextResponse.json({ error: "Could not leave this conversation" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
