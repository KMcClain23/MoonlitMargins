import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { SESSION_COOKIE, parseSessionToken } from "@/lib/adminAuth";
import { getOrCreateTaskConversation, sendMessageAndNotify } from "@/lib/messaging";

const sendSchema = z.object({
  body: z.string().min(1),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = parseSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = supabaseServer();

  const conversationId = await getOrCreateTaskConversation(supabase, id);

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const senderIds = Array.from(new Set((messages ?? []).map((m) => m.sender_id)));
  const { data: senders } = await supabase.from("admin_users").select("id, full_name").in("id", senderIds);
  const nameById = new Map((senders ?? []).map((s) => [s.id, s.full_name]));

  return NextResponse.json({
    messages: (messages ?? []).map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      senderName: nameById.get(m.sender_id) ?? "Unknown",
      body: m.body,
      createdAt: m.created_at,
    })),
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = parseSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = sendSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const supabase = supabaseServer();
  const conversationId = await getOrCreateTaskConversation(supabase, id);

  try {
    await sendMessageAndNotify(supabase, conversationId, session.adminUserId, parsed.data.body);
  } catch {
    return NextResponse.json({ error: "Could not send comment" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
