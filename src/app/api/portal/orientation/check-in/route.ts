import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberSessionFromRequest } from "@/lib/memberAuth";
import { sendExpoPushToAdminUsers } from "@/lib/messaging";
import { sendOrientationCheckInEmail } from "@/lib/resend";

const checkInSchema = z.object({
  message: z.string().min(1),
});

/**
 * Deliberately bypasses the conversations/messages system entirely, rather
 * than finding-or-creating a "direct" conversation the way admin-to-admin
 * DMs do (see getOrCreateDirectConversation in messaging.ts). That system
 * models a message as strictly admin_user -> admin_user -- messages.sender_id
 * is a hard foreign key to admin_users.id, and conversation_participants
 * rows are admin_user_id only. A member has no admin_users row at all, so
 * routing a check-in through it would mean either fabricating a fake
 * admin_users row for every member (polluting a table that's otherwise
 * exactly "who has backend login access," and dragging a member into every
 * other admin-only surface that reads admin_users) or changing
 * messages.sender_id / conversation_participants to accept either a member
 * or an admin_user, which ripples into every other place that already
 * assumes "sender/participant" means "admin_user" (the inbox UI, unread
 * counts, @mentions, etc). Neither is justified just to relay a one-off
 * check-in note during orientation -- this notifies the mentor directly via
 * push + email instead, with no conversation/message row created anywhere.
 */
export async function POST(request: NextRequest) {
  const session = getMemberSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = checkInSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { data: member } = await supabase
    .from("members")
    .select("mentor_admin_user_id")
    .eq("id", session.memberId)
    .maybeSingle();

  if (!member?.mentor_admin_user_id) {
    return NextResponse.json({ error: "You don't have an assigned mentor yet." }, { status: 400 });
  }

  const { data: mentor } = await supabase
    .from("admin_users")
    .select("id, full_name, email")
    .eq("id", member.mentor_admin_user_id)
    .maybeSingle();

  if (!mentor) {
    return NextResponse.json({ error: "Your mentor's account could not be found." }, { status: 500 });
  }

  const { message } = parsed.data;
  const truncatedBody = message.length > 100 ? `${message.slice(0, 100)}…` : message;

  // sendExpoPushToAdminUsers already swallows its own failures internally
  // (missing token, unreachable Expo endpoint, etc) -- see its doc comment
  // in messaging.ts -- so no extra try/catch is needed around it here.
  await sendExpoPushToAdminUsers(supabase, [mentor.id as string], {
    title: `${session.fullName} checked in`,
    body: truncatedBody,
    data: { kind: "orientation_check_in", memberId: session.memberId },
  });

  // Best-effort, same "never block the real action" rule as every other
  // notification in this app -- there's no local DB write behind a
  // check-in to fall back on if this fails, but there's also nothing left
  // to do about it besides log it; the push above is the other channel.
  try {
    await sendOrientationCheckInEmail({
      recipientEmail: mentor.email as string,
      mentorName: mentor.full_name as string,
      memberName: session.fullName,
      message,
    });
  } catch (err) {
    console.error("[portal/orientation/check-in] Email threw:", err);
  }

  return NextResponse.json({ success: true });
}
