"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signedOutNotice, setSignedOutNotice] = useState<"manual" | "inactive" | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get("reason");
    if (reason === "manual" || reason === "inactive") setSignedOutNotice(reason);

    // Set by GET /api/admin/auth/google/callback when it redirects back
    // here instead of issuing a session.
    const googleError = params.get("error");
    if (googleError === "no_account") {
      setError("No admin account found for this Google email.");
    } else if (googleError === "google_failed") {
      setError("Something went wrong signing in with Google. Try again.");
    }
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

      {signedOutNotice ? (
        <div className="mt-3 rounded-xl border border-hairline bg-surface p-3">
          <p className="text-sm text-muted">
            {signedOutNotice === "inactive"
              ? "You were signed out after 30 minutes of inactivity."
              : "You've been signed out."}
          </p>
          <Link href="/" className="mt-1 inline-block text-sm text-lilac-soft hover:underline">
            &larr; Back to the main site
          </Link>
        </div>
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

      <div className="mt-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-hairline" />
        <span className="text-xs text-muted">or</span>
        <div className="h-px flex-1 bg-hairline" />
      </div>

      {/* Plain navigation, not a fetch -- GET /api/admin/auth/google
          redirects the whole page to Google's consent screen. */}
      <a
        href="/api/admin/auth/google"
        className="mt-6 block w-full rounded-full border border-hairline bg-surface px-6 py-3 text-center text-sm font-medium text-parchment transition-colors hover:border-lilac"
      >
        Sign in with Google
      </a>
    </div>
  );
}
