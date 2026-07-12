"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [inactiveNotice, setInactiveNotice] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reason") === "inactive") setInactiveNotice(true);
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Incorrect email or password.");
      return;
    }

    router.push("/admin/applications");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-6">
      <p className="eyebrow mb-3">Leadership only</p>
      <h1 className="font-voice text-3xl text-parchment">Admin sign in</h1>
      {inactiveNotice ? (
        <p className="mt-3 text-sm text-muted">
          You were signed out after 30 minutes of inactivity. Sign back in to continue.
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm text-muted">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            className="w-full rounded-lg border border-hairline bg-surface px-4 py-3 text-sm text-parchment focus:border-lilac"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-muted">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-hairline bg-surface px-4 py-3 text-sm text-parchment focus:border-lilac"
          />
        </label>

        {error ? <p className="text-sm text-candle">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-lilac px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
