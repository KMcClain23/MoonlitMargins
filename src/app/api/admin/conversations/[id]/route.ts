import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionFromRequest } from "@/lib/adminAuth";

const patchSchema = z
  .object({
    muted: z.boolean().optional(),
    read: z.boolean().optional(),
    title: z.string().optional(),
  })
  .refine((data) => data.muted !== undefined || data.read !== undefined || data.title !== undefined, {
    message: "Provide at least one of muted, read, or title",
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

// muted/read update the requester's own conversation_participants row
// (per-user, independent of each other) -- title updates the shared
// conversations.title column instead, since a group's name isn't
// per-participant. Any combination of the three can be sent together,
// or any one alone.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    // The "at least one of muted/read/title" check is a whole-body refine
    // (no single field it belongs to), so it lands in formErrors rather
    // than fieldErrors -- return the full flatten() rather than just
    // fieldErrors, or that message would silently disappear.
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = supabaseServer();

  if (!(await requireParticipant(supabase, id, session.adminUserId))) {
    return NextResponse.json({ error: "Not a participant of this conversation" }, { status: 403 });
  }

  const { muted, read, title } = parsed.data;

  // Renaming: any current participant can do this (not just whoever
  // created the group), but only for type "group" -- a "direct"
  // conversation's title is always computed from the other participant's
  // name, never stored, so there's nothing to rename.
  if (title !== undefined) {
    const { data: conversation } = await supabase.from("conversations").select("type").eq("id", id).maybeSingle();

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    if (conversation.type !== "group") {
      return NextResponse.json({ error: "Only group conversations can be renamed" }, { status: 400 });
    }

    const { error: titleError } = await supabase.from("conversations").update({ title }).eq("id", id);
    if (titleError) {
      return NextResponse.json({ error: "Could not rename this conversation" }, { status: 500 });
    }
  }

  const participantUpdates: { muted?: boolean; last_read_at?: string | null } = {};
  if (muted !== undefined) participantUpdates.muted = muted;
  if (read !== undefined) participantUpdates.last_read_at = read ? new Date().toISOString() : null;

  if (Object.keys(participantUpdates).length > 0) {
    const { error } = await supabase
      .from("conversation_participants")
      .update(participantUpdates)
      .eq("conversation_id", id)
      .eq("admin_user_id", session.adminUserId);

    if (error) {
      return NextResponse.json({ error: "Could not update conversation" }, { status: 500 });
    }
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
