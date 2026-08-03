"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function PortalSetupPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") ?? "");
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("This setup link is missing its token. Use the link from your invite email.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/portal/auth/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Something went wrong. Try again.");
      return;
    }

    router.push("/portal/orientation");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-6">
      <p className="eyebrow mb-3">Member portal</p>
      <h1 className="font-voice text-3xl text-parchment">Set up your account</h1>
      <p className="mt-2 text-sm text-muted">Choose a password to finish setting up your portal login.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm text-muted">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoFocus
            className="w-full rounded-lg border border-hairline bg-surface px-4 py-3 text-sm text-parchment focus:border-lilac"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-muted">Confirm password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-lg border border-hairline bg-surface px-4 py-3 text-sm text-parchment focus:border-lilac"
          />
        </label>

        {error ? <p className="text-sm text-candle">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-lilac px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft disabled:opacity-50"
        >
          {loading ? "Saving…" : "Set password & sign in"}
        </button>
      </form>
    </div>
  );
}
