import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionFromRequest } from "@/lib/adminAuth";
import { sendMessageAndNotify } from "@/lib/messaging";

const sendSchema = z.object({
  body: z.string().min(1),
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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = supabaseServer();

  if (!(await requireParticipant(supabase, id, session.adminUserId))) {
    return NextResponse.json({ error: "Not a participant of this conversation" }, { status: 403 });
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("conversation_id", id)
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
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = sendSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const supabase = supabaseServer();

  if (!(await requireParticipant(supabase, id, session.adminUserId))) {
    return NextResponse.json({ error: "Not a participant of this conversation" }, { status: 403 });
  }

  try {
    await sendMessageAndNotify(supabase, id, session.adminUserId, parsed.data.body);
  } catch {
    return NextResponse.json({ error: "Could not send message" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
