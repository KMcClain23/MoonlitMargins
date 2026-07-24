"use client";

import { useEffect, useState, FormEvent } from "react";

export default function AccountPage() {
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [defaultSection, setDefaultSection] = useState("applications");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [redirecting, setRedirecting] = useState(false);

  const [linkedGoogleEmail, setLinkedGoogleEmail] = useState<string | null>(null);
  const [googleNotice, setGoogleNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setMustChangePassword(Boolean(data.mustChangePassword));
        if (data.sections?.[0]) setDefaultSection(data.sections[0]);
        setLinkedGoogleEmail(data.linkedGoogleEmail ?? null);
      })
      .catch(() => {});
  }, []);

  // Set by GET /api/admin/auth/google/callback when it redirects back
  // here after a "link Google account" attempt.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linked = params.get("linked");
    const linkError = params.get("error");

    if (linked === "success") {
      setGoogleNotice({ type: "success", message: "Google account linked." });
    } else if (linkError === "already_linked") {
      setGoogleNotice({
        type: "error",
        message: "That Google account is already linked to a different admin.",
      });
    } else if (linkError === "google_failed") {
      setGoogleNotice({ type: "error", message: "Something went wrong linking your Google account. Try again." });
    }

    if (linked || linkError) {
      // Drop the query params so refreshing the page doesn't re-show a
      // stale notice.
      window.history.replaceState({}, "", "/admin/account");
    }
  }, []);

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

    if (mustChangePassword) {
      setMustChangePassword(false);
      setRedirecting(true);
      // This was a forced change (temporary password) -- take them straight
      // into the section they actually came here to use.
      //
      // A hard navigation (not router.push) is required here: while the
      // account was locked to /admin/account, AdminNav's <Link>s to every
      // other section were still in the DOM and got auto-prefetched by
      // Next.js -- each of those prefetches hit middleware while
      // mustChangePassword was still true and got cached as a redirect
      // back to /admin/account. router.push() reuses that stale client
      // Router Cache and silently does nothing, leaving the user stuck
      // here even though the server-side session already updated.
      // Reloading the page from scratch discards that stale cache instead
      // of trying to invalidate every entry it poisoned.
      setTimeout(() => {
        window.location.href = `/admin/${defaultSection}`;
      }, 1200);
    }
  }

  async function handleUnlinkGoogle() {
    setIsUnlinking(true);
    setGoogleNotice(null);

    const res = await fetch("/api/admin/account/unlink-google", { method: "PATCH" });

    setIsUnlinking(false);

    if (!res.ok) {
      setGoogleNotice({ type: "error", message: "Couldn't unlink your Google account. Try again." });
      return;
    }

    setLinkedGoogleEmail(null);
    setGoogleNotice({ type: "success", message: "Google account unlinked." });
  }

  return (
    <div>
      <h1 className="font-voice text-3xl text-parchment">Account</h1>

      {mustChangePassword ? (
        <div className="mt-4 max-w-sm rounded-2xl border border-candle/40 bg-candle/10 p-4 text-sm text-candle">
          You&rsquo;re still using a temporary password. Set your own password below to continue.
        </div>
      ) : null}

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
        {status === "success" ? (
          <p className="text-sm text-lilac-soft">
            Password updated{redirecting ? " — taking you to the dashboard…" : "."}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-full bg-lilac px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft disabled:opacity-50"
        >
          {status === "loading" ? "Saving…" : "Update password"}
        </button>
      </form>

      <div className="mt-6 max-w-sm space-y-4 rounded-2xl border border-hairline bg-surface p-6">
        <p className="font-voice text-lg text-parchment">Google account</p>

        {googleNotice ? (
          <p className={`text-sm ${googleNotice.type === "error" ? "text-candle" : "text-lilac-soft"}`}>
            {googleNotice.message}
          </p>
        ) : null}

        {linkedGoogleEmail ? (
          <>
            <p className="text-sm text-muted">
              Linked to <span className="text-parchment">{linkedGoogleEmail}</span>
            </p>
            <button
              type="button"
              onClick={handleUnlinkGoogle}
              disabled={isUnlinking}
              className="rounded-full border border-hairline px-5 py-2 text-sm font-medium text-parchment transition-colors hover:border-candle disabled:opacity-50"
            >
              {isUnlinking ? "Unlinking…" : "Unlink"}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">
              Link a Google account for quick sign-in, separate from your login email.
            </p>
            {/* Plain navigation, not a fetch -- GET /api/admin/auth/google/link
                redirects the whole page to Google's consent screen. */}
            <a
              href="/api/admin/auth/google/link"
              className="inline-block rounded-full border border-hairline px-5 py-2 text-sm font-medium text-parchment transition-colors hover:border-lilac"
            >
              Link Google Account
            </a>
          </>
        )}
      </div>
    </div>
  );
}
