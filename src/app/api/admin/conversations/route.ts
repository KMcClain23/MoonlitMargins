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
    .select("conversation_id, admin_user_id, last_read_at, muted")
    .in("conversation_id", (conversations ?? []).map((c) => c.id));

  const { data: adminUsers } = await supabase.from("admin_users").select("id, full_name, member_id");
  const nameById = new Map((adminUsers ?? []).map((u) => [u.id, u.full_name]));

  // Not every admin_user has a linked member profile (e.g. a developer
  // account) -- those simply have no photo, not an error.
  const memberIds = (adminUsers ?? [])
    .map((u) => u.member_id)
    .filter((id): id is string => id !== null);
  const { data: members } =
    memberIds.length > 0
      ? await supabase.from("members").select("id, photo_url").in("id", memberIds)
      : { data: [] };
  const photoUrlByMemberId = new Map((members ?? []).map((m) => [m.id, m.photo_url as string | null]));
  const photoUrlByAdminUserId = new Map(
    (adminUsers ?? []).map((u) => [u.id, u.member_id ? (photoUrlByMemberId.get(u.member_id) ?? null) : null])
  );

  // One fetch covers both the unread count AND the list row's
  // last-message preview -- every message (not just other people's) in
  // these conversations, newest first, so a single pass below can derive
  // "how many came in after I last read this" and "what's the very first
  // (i.e. most recent) one" at the same time, rather than querying twice.
  const { data: recentMessages } = await supabase
    .from("messages")
    .select("conversation_id, sender_id, body, created_at")
    .in("conversation_id", (conversations ?? []).map((c) => c.id))
    .order("created_at", { ascending: false });

  const lastReadByConversation = new Map(
    (allParticipants ?? [])
      .filter((p) => p.admin_user_id === session.adminUserId)
      .map((p) => [p.conversation_id, p.last_read_at as string | null])
  );

  const mutedByConversation = new Map(
    (allParticipants ?? [])
      .filter((p) => p.admin_user_id === session.adminUserId)
      .map((p) => [p.conversation_id, Boolean(p.muted)])
  );

  const unreadCountByConversation = new Map<string, number>();
  // Truncated here (not just client-side) so the response stays lean
  // regardless of how long a real message body gets.
  const lastMessageByConversation = new Map<string, { body: string; senderId: string }>();

  for (const message of recentMessages ?? []) {
    if (message.sender_id !== session.adminUserId) {
      const lastReadAt = lastReadByConversation.get(message.conversation_id);
      if (!lastReadAt || message.created_at > lastReadAt) {
        unreadCountByConversation.set(
          message.conversation_id,
          (unreadCountByConversation.get(message.conversation_id) ?? 0) + 1
        );
      }
    }

    // Results are newest-first, so the first message seen per
    // conversation is its most recent one.
    if (!lastMessageByConversation.has(message.conversation_id)) {
      lastMessageByConversation.set(message.conversation_id, {
        body: message.body.length > 140 ? `${message.body.slice(0, 140)}…` : message.body,
        senderId: message.sender_id,
      });
    }
  }

  const result = (conversations ?? []).map((c) => {
    const participantIds = (allParticipants ?? [])
      .filter((p) => p.conversation_id === c.id)
      .map((p) => p.admin_user_id);
    const otherParticipantIds = participantIds.filter((id) => id !== session.adminUserId);
    const otherNames = otherParticipantIds.map((id) => nameById.get(id) ?? "Unknown");
    const lastMessage = lastMessageByConversation.get(c.id) ?? null;
    // A group can't be represented by one person's photo -- only direct
    // conversations (exactly one other participant) get a photo, so the
    // UI keeps falling back to initials for groups.
    const otherParticipantPhotoUrl =
      c.type === "direct" && otherParticipantIds.length === 1
        ? (photoUrlByAdminUserId.get(otherParticipantIds[0]!) ?? null)
        : null;
    return {
      id: c.id,
      type: c.type,
      title: c.type === "direct" ? otherNames.join(", ") : c.title || "Untitled group",
      createdAt: c.created_at,
      unreadCount: unreadCountByConversation.get(c.id) ?? 0,
      muted: mutedByConversation.get(c.id) ?? false,
      lastMessagePreview: lastMessage?.body ?? null,
      lastMessageIsMine: lastMessage ? lastMessage.senderId === session.adminUserId : false,
      otherParticipantPhotoUrl,
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
