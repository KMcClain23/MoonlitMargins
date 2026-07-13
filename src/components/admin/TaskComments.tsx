"use client";

import { useEffect, useState } from "react";

type Comment = { id: string; senderId: string; senderName: string; body: string; createdAt: string };

export default function TaskComments({ taskId, currentUserId }: { taskId: string; currentUserId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/tasks/${taskId}/comments`);
    if (res.ok) {
      const data = await res.json();
      setComments(data.messages ?? []);
    }
    setLoaded(true);
  }

  useEffect(() => {
    load();
  }, [taskId]);

  async function handleSend() {
    if (!text.trim()) return;
    setSending(true);
    const res = await fetch(`/api/admin/tasks/${taskId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    setSending(false);
    if (res.ok) {
      setText("");
      load();
    }
  }

  return (
    <div className="rounded-xl border border-hairline bg-ink p-3">
      {!loaded ? (
        <p className="text-xs text-muted">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted">No comments yet.</p>
      ) : (
        <div className="space-y-2">
          {comments.map((c) => (
            <div key={c.id}>
              <p className="text-[10px] text-muted">
                {c.senderId === currentUserId ? "You" : c.senderName} ·{" "}
                {new Date(c.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <p className="text-xs text-parchment">{c.body}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Add a comment…"
          className="flex-1 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs text-parchment focus:border-lilac"
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="rounded-full bg-lilac px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-lilac-soft disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
