import type { SupabaseClient } from "@supabase/supabase-js";
import { sendMessageNotification } from "@/lib/resend";

/**
 * Finds the existing 1:1 conversation between these two people, or creates
 * one. Prevents ending up with duplicate DM threads between the same pair.
 */
export async function getOrCreateDirectConversation(
  supabase: SupabaseClient,
  userAId: string,
  userBId: string
): Promise<string> {
  // A direct conversation between A and B is one where both are
  // participants and the conversation has exactly those two rows.
  const { data: candidateIds } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("admin_user_id", userAId);

  for (const row of candidateIds ?? []) {
    const { data: participants } = await supabase
      .from("conversation_participants")
      .select("admin_user_id")
      .eq("conversation_id", row.conversation_id);

    const ids = new Set((participants ?? []).map((p) => p.admin_user_id));
    if (ids.size === 2 && ids.has(userAId) && ids.has(userBId)) {
      const { data: conversation } = await supabase
        .from("conversations")
        .select("id, type")
        .eq("id", row.conversation_id)
        .single();
      if (conversation?.type === "direct") return conversation.id as string;
    }
  }

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ type: "direct" })
    .select("id")
    .single();
  if (error || !created) throw new Error("Could not create conversation");

  await supabase.from("conversation_participants").insert([
    { conversation_id: created.id, admin_user_id: userAId },
    { conversation_id: created.id, admin_user_id: userBId },
  ]);

  return created.id as string;
}

/**
 * Finds the existing comment thread for a task, or creates one -- with the
 * task's assigner and (if they have their own login) assignee added as
 * participants automatically.
 */
export async function getOrCreateTaskConversation(supabase: SupabaseClient, taskId: string): Promise<string> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("task_id", taskId)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data: task } = await supabase
    .from("tasks")
    .select("assigned_by, assigned_to")
    .eq("id", taskId)
    .single();

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ type: "task", task_id: taskId })
    .select("id")
    .single();
  if (error || !created) throw new Error("Could not create task thread");

  const participantIds = new Set<string>();
  if (task?.assigned_by) participantIds.add(task.assigned_by as string);

  if (task?.assigned_to) {
    const { data: assigneeAccount } = await supabase
      .from("admin_users")
      .select("id")
      .eq("member_id", task.assigned_to)
      .maybeSingle();
    if (assigneeAccount) participantIds.add(assigneeAccount.id as string);
  }

  if (participantIds.size > 0) {
    await supabase.from("conversation_participants").insert(
      Array.from(participantIds).map((adminUserId) => ({
        conversation_id: created.id,
        admin_user_id: adminUserId,
      }))
    );
  }

  return created.id as string;
}

/**
 * Inserts a message and emails every other participant (best-effort --
 * a failed email never blocks the message itself from sending).
 */
export async function sendMessageAndNotify(
  supabase: SupabaseClient,
  conversationId: string,
  senderId: string,
  body: string
) {
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    body,
  });
  if (error) throw new Error("Could not send message");

  const { data: sender } = await supabase
    .from("admin_users")
    .select("full_name")
    .eq("id", senderId)
    .single();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("type, title")
    .eq("id", conversationId)
    .single();

  const { data: participants } = await supabase
    .from("conversation_participants")
    .select("admin_user_id")
    .eq("conversation_id", conversationId)
    .neq("admin_user_id", senderId);

  const recipientIds = (participants ?? []).map((p) => p.admin_user_id);
  if (recipientIds.length === 0 || !sender) return;

  const { data: recipients } = await supabase
    .from("admin_users")
    .select("email")
    .in("id", recipientIds);

  const label =
    conversation?.type === "task"
      ? "a task thread"
      : conversation?.type === "event"
        ? "an event thread"
        : conversation?.type === "group"
          ? conversation.title || "a group conversation"
          : "a direct message";

  await Promise.allSettled(
    (recipients ?? []).map((r) =>
      sendMessageNotification({
        recipientEmail: r.email as string,
        senderName: sender.full_name as string,
        conversationLabel: label,
        body,
      })
    )
  );

  // Best-effort push notification too -- same "never block the message"
  // rule as the email above. A missing/unreachable Expo push endpoint (or
  // simply no registered devices) must not affect message delivery.
  try {
    const { data: pushTokenRows } = await supabase
      .from("admin_push_tokens")
      .select("expo_push_token")
      .in("admin_user_id", recipientIds);

    const tokens = (pushTokenRows ?? []).map((row) => row.expo_push_token as string);

    if (tokens.length > 0) {
      const truncatedBody = body.length > 100 ? `${body.slice(0, 100)}…` : body;

      console.log("Sending Expo push notification", { tokenCount: tokens.length, recipientIds });

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          tokens.map((expoPushToken) => ({
            to: expoPushToken,
            title: sender.full_name as string,
            body: truncatedBody,
            data: { conversationId },
          }))
        ),
      });

      // A 200 alone doesn't mean delivery succeeded -- Expo's push API
      // returns a body with a per-token receipt/error (e.g.
      // DeviceNotRegistered, InvalidCredentials) even on a "successful"
      // request, so the full body is logged here, not just the status.
      const responseBody = await response.json();
      console.log("Expo push send response", response.status, responseBody);
    }
  } catch (err) {
    // Never let a notification failure affect the already-sent message --
    // just log it for diagnostics.
    console.error("Expo push send threw", err);
  }
}

/**
 * Finds the existing discussion thread for an event, or creates one --
 * with every current admin_users account added as a participant, since
 * this is meant as a whole-team thread rather than scoped to just whoever
 * created the event.
 */
export async function getOrCreateEventConversation(supabase: SupabaseClient, eventId: string): Promise<string> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ type: "event", event_id: eventId })
    .select("id")
    .single();
  if (error || !created) throw new Error("Could not create event thread");

  const { data: adminUsers } = await supabase.from("admin_users").select("id");
  if (adminUsers && adminUsers.length > 0) {
    await supabase.from("conversation_participants").insert(
      adminUsers.map((u) => ({ conversation_id: created.id, admin_user_id: u.id }))
    );
  }

  return created.id as string;
}
