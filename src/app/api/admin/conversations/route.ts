import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionFromRequest } from "@/lib/adminAuth";
import { getOrCreateDirectConversation } from "@/lib/messaging";

const createSchema = z.object({
  type: z.enum(["direct", "group"]),
  participantIds: z.array(z.string().uuid()).min(1),
  title: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = supabaseServer();

  const { data: memberships } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("admin_user_id", session.adminUserId);

  const conversationIds = (memberships ?? []).map((m) => m.conversation_id);
  if (conversationIds.length === 0) {
    return NextResponse.json({ conversations: [] });
  }

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, type, title, task_id, created_at")
    .in("id", conversationIds)
    .neq("type", "task")
    .order("created_at", { ascending: false });

  const { data: allParticipants } = await supabase
    .from("conversation_participants")
    .select("conversation_id, admin_user_id, last_read_at")
    .in("conversation_id", (conversations ?? []).map((c) => c.id));

  const { data: adminUsers } = await supabase.from("admin_users").select("id, full_name");
  const nameById = new Map((adminUsers ?? []).map((u) => [u.id, u.full_name]));

  // Unread count per conversation: messages from someone else, sent
  // after the requester's own last_read_at for that conversation (or
  // all of them, if they've never read it at all).
  const { data: unreadCandidates } = await supabase
    .from("messages")
    .select("conversation_id, created_at")
    .in("conversation_id", (conversations ?? []).map((c) => c.id))
    .neq("sender_id", session.adminUserId);

  const lastReadByConversation = new Map(
    (allParticipants ?? [])
      .filter((p) => p.admin_user_id === session.adminUserId)
      .map((p) => [p.conversation_id, p.last_read_at as string | null])
  );

  const unreadCountByConversation = new Map<string, number>();
  for (const message of unreadCandidates ?? []) {
    const lastReadAt = lastReadByConversation.get(message.conversation_id);
    if (!lastReadAt || message.created_at > lastReadAt) {
      unreadCountByConversation.set(
        message.conversation_id,
        (unreadCountByConversation.get(message.conversation_id) ?? 0) + 1
      );
    }
  }

  const result = (conversations ?? []).map((c) => {
    const participantIds = (allParticipants ?? [])
      .filter((p) => p.conversation_id === c.id)
      .map((p) => p.admin_user_id);
    const otherNames = participantIds
      .filter((id) => id !== session.adminUserId)
      .map((id) => nameById.get(id) ?? "Unknown");
    return {
      id: c.id,
      type: c.type,
      title: c.type === "direct" ? otherNames.join(", ") : c.title || "Untitled group",
      createdAt: c.created_at,
      unreadCount: unreadCountByConversation.get(c.id) ?? 0,
    };
  });

  return NextResponse.json({ conversations: result });
}

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { type, participantIds, title } = parsed.data;
  const supabase = supabaseServer();

  if (type === "direct") {
    if (participantIds.length !== 1) {
      return NextResponse.json({ error: "A direct conversation needs exactly one other person" }, { status: 400 });
    }
    const conversationId = await getOrCreateDirectConversation(supabase, session.adminUserId, participantIds[0]!);
    return NextResponse.json({ conversationId });
  }

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ type: "group", title: title || null })
    .select("id")
    .single();
  if (error || !created) {
    return NextResponse.json({ error: "Could not create group" }, { status: 500 });
  }

  const allParticipantIds = Array.from(new Set([session.adminUserId, ...participantIds]));
  await supabase.from("conversation_participants").insert(
    allParticipantIds.map((adminUserId) => ({ conversation_id: created.id, admin_user_id: adminUserId }))
  );

  return NextResponse.json({ conversationId: created.id });
}
