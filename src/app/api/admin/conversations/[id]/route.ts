import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionFromRequest } from "@/lib/adminAuth";

const patchSchema = z.object({
  muted: z.boolean(),
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

// Mutes/unmutes push notifications for this conversation -- only for the
// requester's own participant row. Doesn't affect other participants,
// the conversation itself, or whether messages still arrive/count as
// unread for the requester -- muting only suppresses push.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const supabase = supabaseServer();

  if (!(await requireParticipant(supabase, id, session.adminUserId))) {
    return NextResponse.json({ error: "Not a participant of this conversation" }, { status: 403 });
  }

  const { muted } = parsed.data;
  const { error } = await supabase
    .from("conversation_participants")
    .update({ muted })
    .eq("conversation_id", id)
    .eq("admin_user_id", session.adminUserId);

  if (error) {
    return NextResponse.json({ error: "Could not update mute setting" }, { status: 500 });
  }

  return NextResponse.json({ success: true, muted });
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
