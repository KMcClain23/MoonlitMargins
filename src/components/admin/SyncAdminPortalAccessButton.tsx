"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Granted = { fullName: string; loginEmail: string; emailMatchesAdmin: boolean };
type Skipped = { fullName: string; reason: string };

export default function SyncAdminPortalAccessButton({ eligibleCount }: { eligibleCount: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [granted, setGranted] = useState<Granted[] | null>(null);
  const [skipped, setSkipped] = useState<Skipped[]>([]);
  const [error, setError] = useState("");

  async function handleRun() {
    if (
      !confirm(
        `Give portal access to all ${eligibleCount} admin${eligibleCount === 1 ? "" : "s"} using their existing admin email and password? No new password is created -- they'll log in at /portal/login with what they already use for /admin.`
      )
    ) {
      return;
    }

    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/members/sync-admin-portal-access", { method: "POST" });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Couldn't sync portal access.");
      return;
    }

    const data = await res.json();
    setGranted(data.granted ?? []);
    setSkipped(data.skipped ?? []);
    router.refresh();
  }

  if (granted) {
    return (
      <div className="space-y-4 rounded-2xl border border-lilac/40 bg-surface p-6">
        <p className="font-voice text-lg text-parchment">
          {granted.length === 0
            ? "Nothing to sync"
            : `Granted portal access to ${granted.length} admin${granted.length === 1 ? "" : "s"}`}
        </p>

        {granted.length > 0 ? (
          <div className="space-y-2">
            {granted.map((g) => (
              <div key={g.loginEmail} className="rounded-lg border border-hairline p-2.5">
                <p className="text-xs text-parchment">{g.fullName}</p>
                <p className="text-[11px] text-muted">
                  Logs into the portal with: {g.loginEmail}
                  {!g.emailMatchesAdmin ? (
                    <span className="text-candle"> (different from their admin login email)</span>
                  ) : null}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {skipped.length > 0 ? (
          <div>
            <p className="text-xs text-candle">Skipped:</p>
            <ul className="mt-1 text-xs text-muted">
              {skipped.map((s) => (
                <li key={s.fullName}>
                  {s.fullName} &mdash; {s.reason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <button onClick={() => setGranted(null)} className="text-xs text-muted hover:text-parchment">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-6">
      <p className="font-voice text-lg text-parchment">Grant portal access using admin credentials</p>
      <p className="mt-2 text-sm text-muted">
        {eligibleCount === 0
          ? "Every admin with a linked member profile already has portal access, or has none to link."
          : `${eligibleCount} admin${eligibleCount === 1 ? "" : "s"} with a linked member profile don't have portal access yet. This copies their existing admin password straight over -- same email and password they already use to sign into /admin, no new setup needed.`}
      </p>
      {error ? <p className="mt-2 text-sm text-candle">{error}</p> : null}
      {eligibleCount > 0 ? (
        <button
          onClick={handleRun}
          disabled={loading}
          className="mt-4 rounded-full bg-lilac px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft disabled:opacity-50"
        >
          {loading ? "Syncing…" : `Grant access to ${eligibleCount} admin${eligibleCount === 1 ? "" : "s"}`}
        </button>
      ) : null}
    </div>
  );
}
