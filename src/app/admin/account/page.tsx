"use client";

import { useState, FormEvent } from "react";

export default function AccountPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");

    const res = await fetch("/api/admin/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setStatus("error");
      setError(typeof body?.error === "string" ? body.error : "Couldn't change your password.");
      return;
    }

    setStatus("success");
    setCurrentPassword("");
    setNewPassword("");
  }

  return (
    <div>
      <h1 className="font-voice text-3xl text-parchment">Account</h1>

      <form onSubmit={handleSubmit} className="mt-6 max-w-sm space-y-4 rounded-2xl border border-hairline bg-surface p-6">
        <p className="font-voice text-lg text-parchment">Change password</p>

        <label className="block">
          <span className="mb-2 block text-sm text-muted">Current password</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-muted">New password</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
          />
        </label>

        {status === "error" ? <p className="text-sm text-candle">{error}</p> : null}
        {status === "success" ? <p className="text-sm text-lilac-soft">Password updated.</p> : null}

        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-full bg-lilac px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft disabled:opacity-50"
        >
          {status === "loading" ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
