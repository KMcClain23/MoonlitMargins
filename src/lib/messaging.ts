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
}
