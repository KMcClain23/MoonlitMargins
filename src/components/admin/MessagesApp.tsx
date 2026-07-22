"use client";

import { useEffect, useRef, useState } from "react";

type Conversation = { id: string; type: "direct" | "group"; title: string; createdAt: string };
type Message = { id: string; senderId: string; senderName: string; body: string; createdAt: string };

const POLL_INTERVAL_MS = 5000;

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

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-[280px_1fr]">
      <div className="rounded-2xl border border-hairline bg-surface p-3">
        {/* Desktop: full-width bar button, same as always. Mobile: a
            floating circular "+" button instead (below), so this one is
            hidden there. */}
        <button
          onClick={() => setShowNew((v) => !v)}
          className="mb-3 hidden w-full rounded-full bg-lilac px-4 py-2 text-xs font-medium text-ink transition-colors hover:bg-lilac-soft sm:block"
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
          <div className="mb-3 space-y-3 rounded-xl border border-hairline bg-ink p-3">
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

        <div className="space-y-1">
          {conversations.length === 0 ? (
            <p className="p-2 text-xs text-muted">No conversations yet.</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selectedId === c.id ? "bg-lilac/20 text-parchment" : "text-muted hover:bg-ink hover:text-parchment"
                }`}
              >
                {c.title}
                {c.type === "group" ? <span className="ml-1.5 text-[10px] text-lilac-soft">Group</span> : null}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex min-h-[400px] flex-col rounded-2xl border border-hairline bg-surface p-4">
        {!selectedConversation ? (
          <p className="m-auto text-sm text-muted">Select a conversation, or start a new one.</p>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <p className="font-voice text-lg text-parchment">{selectedConversation.title}</p>
              <button
                onClick={() => handleLeave(selectedConversation.id)}
                disabled={leaving}
                className="text-xs text-candle transition-colors hover:underline disabled:opacity-50"
              >
                Leave
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto py-4">
              {messages.map((m) => (
                <div key={m.id} className={m.senderId === currentUserId ? "text-right" : ""}>
                  <p className="text-[10px] text-muted">
                    {m.senderId === currentUserId ? "You" : m.senderName} ·{" "}
                    {new Date(m.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                  <p
                    className={`mt-1 inline-block max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                      m.senderId === currentUserId ? "bg-lilac text-ink" : "bg-ink text-parchment"
                    }`}
                  >
                    {m.body}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 border-t border-hairline pt-3">
              <input
                value={composeText}
                onChange={(e) => setComposeText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                placeholder="Type a message…"
                className="flex-1 rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
              />
              <button
                onClick={handleSend}
                disabled={sending || !composeText.trim()}
                className="rounded-full bg-lilac px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft disabled:opacity-50"
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
