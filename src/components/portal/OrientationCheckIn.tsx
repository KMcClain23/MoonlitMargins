"use client";

import { useState } from "react";

export default function OrientationCheckIn({ mentorName }: { mentorName: string }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    setStatus("idle");

    const res = await fetch("/api/portal/orientation/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim() }),
    });

    setSending(false);

    if (res.ok) {
      setMessage("");
      setStatus("sent");
    } else {
      setStatus("error");
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-hairline bg-surface p-4">
      <p className="text-sm text-parchment">Send an update to your mentor</p>
      <p className="mt-1 text-xs text-muted">Goes straight to {mentorName}.</p>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder="How's orientation going?"
        className="mt-3 w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
      />

      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="rounded-full bg-lilac px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send"}
        </button>
        {status === "sent" ? <span className="text-xs text-lilac-soft">Sent!</span> : null}
        {status === "error" ? <span className="text-xs text-candle">Couldn&rsquo;t send. Try again.</span> : null}
      </div>
    </div>
  );
}
