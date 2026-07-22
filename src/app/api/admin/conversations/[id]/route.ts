import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionFromRequest } from "@/lib/adminAuth";

async function requireParticipant(supabase: ReturnType<typeof supabaseServer>, conversationId: string, adminUserId: string) {
  const { data } = await supabase
    .from("conversation_participants")
    .select("admin_user_id")
    .eq("conversation_id", conversationId)
    .eq("admin_user_id", adminUserId)
    .maybeSingle();
  return Boolean(data);
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
