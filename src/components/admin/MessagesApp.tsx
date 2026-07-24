"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type Conversation = {
  id: string;
  type: "direct" | "group";
  title: string;
  createdAt: string;
  unreadCount: number;
  muted: boolean;
  /** Truncated server-side -- see GET /api/admin/conversations. Null
   * when the conversation has no messages yet. */
  lastMessagePreview: string | null;
  lastMessageIsMine: boolean;
  /** Direct conversations only -- the other participant's linked member
   * photo, or null if they have none. Always null for groups (a group
   * can't be represented by one person's photo), which keep using
   * initials below regardless of this field. */
  otherParticipantPhotoUrl: string | null;
};
type Message = { id: string; senderId: string; senderName: string; body: string; createdAt: string };

const POLL_INTERVAL_MS = 5000;

// Matches the mobile app's own getInitials() convention (first letter of
// the first word + first letter of the last word), so a person's avatar
// initials read the same on both platforms.
function getInitials(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

// GET /api/admin/conversations falls back to this exact literal string
// for a group created without a name -- checked against it directly
// (rather than e.g. "no title set") so the softened styling below only
// applies to that specific fallback, not to a group someone genuinely
// named "Untitled group" on purpose.
const UNTITLED_GROUP_TITLE = "Untitled group";

function formatMessageTime(createdAt: string): string {
  return new Date(createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default function MessagesApp({
  currentUserId,
  adminUsers,
}: {
  currentUserId: string;
  adminUsers: { id: string; full_name: string }[];
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [composeText, setComposeText] = useState("");
  const [sending, setSending] = useState(false);

  const [leaving, setLeaving] = useState(false);

  const [showNew, setShowNew] = useState(false);
  const [newType, setNewType] = useState<"direct" | "group">("direct");
  const [newParticipantIds, setNewParticipantIds] = useState<string[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newError, setNewError] = useState("");

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadConversations() {
    const res = await fetch("/api/admin/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations ?? []);
    }
  }

  async function loadMessages(conversationId: string) {
    const res = await fetch(`/api/admin/conversations/${conversationId}/messages`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages ?? []);
    }
  }

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadMessages(selectedId);

    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = setInterval(() => loadMessages(selectedId), POLL_INTERVAL_MS);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [selectedId]);

  async function handleSend() {
    if (!selectedId || !composeText.trim()) return;
    setSending(true);
    const res = await fetch(`/api/admin/conversations/${selectedId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: composeText }),
    });
    setSending(false);
    if (res.ok) {
      setComposeText("");
      loadMessages(selectedId);
    }
  }

  // Already existed and already worked (DELETE /api/admin/conversations/[id]
  // was built for the mobile app and wired up here too) -- what was
  // actually missing was a way to reach it without first opening the
  // conversation. The per-row hover icon added below calls this same
  // function; nothing about the leave logic itself needed to change.
  async function handleLeave(conversationId: string) {
    if (!confirm("Leave this conversation? You won't see it here anymore.")) return;
    setLeaving(true);
    const res = await fetch(`/api/admin/conversations/${conversationId}`, { method: "DELETE" });
    setLeaving(false);
    if (res.ok) {
      // Only this row's participation is gone server-side -- drop it from
      // the local list directly rather than refetching everything.
      setConversations((current) => current.filter((c) => c.id !== conversationId));
      if (selectedId === conversationId) {
        setSelectedId(null);
        setMessages([]);
      }
    } else {
      alert("Couldn't leave that conversation.");
    }
  }

  async function handleCreateConversation() {
    setNewError("");
    if (newParticipantIds.length === 0) {
      setNewError("Pick at least one person.");
      return;
    }
    const res = await fetch("/api/admin/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: newType, participantIds: newParticipantIds, title: newTitle || undefined }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setNewError(typeof body?.error === "string" ? body.error : "Couldn't start that conversation.");
      return;
    }
    const data = await res.json();
    setShowNew(false);
    setNewParticipantIds([]);
    setNewTitle("");
    await loadConversations();
    setSelectedId(data.conversationId);
  }

  const selectedConversation = conversations.find((c) => c.id === selectedId);
  const isSelectedUntitledGroup =
    selectedConversation?.type === "group" && selectedConversation.title === UNTITLED_GROUP_TITLE;

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-[280px_1fr]">
      <div className="flex h-[700px] flex-col overflow-hidden rounded-2xl border border-hairline bg-surface p-3">
        {/* Desktop: full-width bar button, same as always. Mobile: a
            floating circular "+" button instead (below), so this one is
            hidden there. */}
        <button
          onClick={() => setShowNew((v) => !v)}
          className="mb-3 hidden w-full shrink-0 rounded-full bg-lilac px-4 py-2 text-xs font-medium text-ink transition-colors hover:bg-lilac-soft sm:block"
        >
          New message
        </button>

        {/* Mobile-only floating action button -- fixed to the viewport
            (not the panel) so it stays clearly separated from the
            conversation list beneath it, Android-style. */}
        <button
          onClick={() => setShowNew((v) => !v)}
          aria-label="New message"
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-lilac text-ink shadow-lg shadow-black/40 transition-transform hover:bg-lilac-soft active:scale-95 sm:hidden"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>

        {showNew ? (
          <div className="mb-3 shrink-0 space-y-3 rounded-xl border border-hairline bg-ink p-3">
            <div className="flex gap-2 text-xs">
              <button
                onClick={() => setNewType("direct")}
                className={`rounded-full px-3 py-1 ${newType === "direct" ? "bg-lilac text-ink" : "border border-hairline text-muted"}`}
              >
                Direct
              </button>
              <button
                onClick={() => setNewType("group")}
                className={`rounded-full px-3 py-1 ${newType === "group" ? "bg-lilac text-ink" : "border border-hairline text-muted"}`}
              >
                Group
              </button>
            </div>

            {newType === "group" ? (
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Group name"
                className="w-full rounded-lg border border-hairline bg-surface px-2 py-1.5 text-xs text-parchment focus:border-lilac"
              />
            ) : null}

            <div className="max-h-40 space-y-1 overflow-y-auto">
              {adminUsers.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-xs text-parchment">
                  <input
                    type={newType === "direct" ? "radio" : "checkbox"}
                    name="participant"
                    checked={newParticipantIds.includes(u.id)}
                    onChange={() =>
                      setNewParticipantIds(
                        newType === "direct"
                          ? [u.id]
                          : newParticipantIds.includes(u.id)
                            ? newParticipantIds.filter((id) => id !== u.id)
                            : [...newParticipantIds, u.id]
                      )
                    }
                    className="h-3.5 w-3.5"
                  />
                  {u.full_name}
                </label>
              ))}
            </div>

            {newError ? <p className="text-xs text-candle">{newError}</p> : null}

            <button
              onClick={handleCreateConversation}
              className="w-full rounded-full bg-lilac px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-lilac-soft"
            >
              Start conversation
            </button>
          </div>
        ) : null}

        <div className="conversation-list-scroll -mx-3 flex-1 divide-y divide-hairline overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted">No conversations yet.</p>
          ) : (
            conversations.map((c) => {
              const isUntitled = c.type === "group" && c.title === UNTITLED_GROUP_TITLE;
              return (
                <div
                  key={c.id}
                  className={`group flex w-full items-center gap-3 px-3 py-2.5 transition-colors ${
                    selectedId === c.id ? "bg-surfaceRaised" : "hover:bg-surfaceRaised/60"
                  }`}
                >
                  <button
                    onClick={() => setSelectedId(c.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    {c.type === "direct" && c.otherParticipantPhotoUrl ? (
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full">
                        <Image
                          src={c.otherParticipantPhotoUrl}
                          alt={c.title}
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lilac/15 text-xs font-semibold text-lilac-soft">
                        {getInitials(c.title)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p
                          className={`truncate text-sm font-medium ${
                            isUntitled ? "italic text-muted" : "text-parchment"
                          }`}
                        >
                          {c.title}
                        </p>
                        {c.type === "group" ? (
                          <span className="shrink-0 text-[10px] text-lilac-soft">Group</span>
                        ) : null}
                      </div>
                      {c.lastMessagePreview ? (
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {c.lastMessageIsMine ? "You: " : ""}
                          {c.lastMessagePreview}
                        </p>
                      ) : null}
                    </div>
                  </button>

                  <button
                    onClick={() => handleLeave(c.id)}
                    disabled={leaving}
                    aria-label="Leave conversation"
                    title="Leave conversation"
                    className="shrink-0 rounded-full p-1.5 text-muted opacity-0 transition-opacity hover:bg-candle/15 hover:text-candle disabled:opacity-50 group-hover:opacity-100"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M9 6L18 15M18 6L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex h-[700px] flex-col overflow-hidden rounded-2xl border border-hairline bg-surface">
        {!selectedConversation ? (
          <p className="m-auto text-sm text-muted">Select a conversation, or start a new one.</p>
        ) : (
          <>
            <div className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-3">
              <p
                className={`font-voice text-lg ${isSelectedUntitledGroup ? "italic text-muted" : "text-parchment"}`}
              >
                {selectedConversation.title}
              </p>
              <button
                onClick={() => handleLeave(selectedConversation.id)}
                disabled={leaving}
                className="shrink-0 text-xs text-candle transition-colors hover:underline disabled:opacity-50"
              >
                Leave
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-ink px-4 py-4">
              {messages.map((m) => {
                const isMine = m.senderId === currentUserId;
                return (
                  <div key={m.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                    <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted">
                      {isMine ? "You" : m.senderName} · {formatMessageTime(m.createdAt)}
                    </p>
                    <p
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isMine ? "rounded-br-sm bg-lilac text-ink" : "rounded-bl-sm bg-surface text-parchment"
                      }`}
                    >
                      {m.body}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex shrink-0 gap-2 border-t border-hairline bg-surfaceRaised px-4 py-3">
              <input
                value={composeText}
                onChange={(e) => setComposeText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                placeholder="Type a message…"
                className="flex-1 rounded-full border border-hairline bg-surface px-4 py-2.5 text-sm text-parchment focus:border-lilac"
              />
              <button
                onClick={handleSend}
                disabled={sending || !composeText.trim()}
                className="shrink-0 rounded-full bg-lilac px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
