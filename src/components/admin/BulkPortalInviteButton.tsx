"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Invited = { id: string; fullName: string; email: string | null; setupUrl: string };
type Failed = { id: string; fullName: string };

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context) -- the
      // link is still selectable/visible in the row either way.
    }
  }

  return (
    <button onClick={handleCopy} className="shrink-0 text-xs text-lilac-soft hover:underline">
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}

export default function BulkPortalInviteButton({ eligibleCount }: { eligibleCount: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [invited, setInvited] = useState<Invited[] | null>(null);
  const [failed, setFailed] = useState<Failed[]>([]);
  const [error, setError] = useState("");

  async function handleRun() {
    if (
      !confirm(
        `Generate portal setup links for all ${eligibleCount} member${eligibleCount === 1 ? "" : "s"} who don't have portal access yet? An invite email will also be attempted for anyone with an address on file.`
      )
    ) {
      return;
    }

    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/members/bulk-portal-invite", { method: "POST" });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Couldn't run bulk invites.");
      return;
    }

    const data = await res.json();
    setInvited(data.invited ?? []);
    setFailed(data.failed ?? []);
    router.refresh();
  }

  if (invited) {
    return (
      <div className="space-y-4 rounded-2xl border border-lilac/40 bg-surface p-6">
        <p className="font-voice text-lg text-parchment">
          {invited.length === 0
            ? "Nothing to invite"
            : `Generated ${invited.length} portal invite${invited.length === 1 ? "" : "s"}`}
        </p>

        {invited.length > 0 ? (
          <>
            <p className="text-xs text-candle">
              Resend is still on its sandbox sender, so the invite email may not have actually
              arrived -- copy each link below and send it directly (text, DM, in person) as a
              backup. Links expire in 72 hours.
            </p>
            <div className="space-y-2">
              {invited.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hairline p-2.5"
                >
                  <div>
                    <p className="text-xs text-parchment">{m.fullName}</p>
                    <p className="text-[11px] text-muted">{m.email ?? "No email on file"}</p>
                  </div>
                  <CopyLinkButton url={m.setupUrl} />
                </div>
              ))}
            </div>
          </>
        ) : null}

        {failed.length > 0 ? (
          <div>
            <p className="text-xs text-candle">Couldn&rsquo;t generate an invite for:</p>
            <ul className="mt-1 text-xs text-muted">
              {failed.map((f) => (
                <li key={f.id}>{f.fullName}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <button onClick={() => setInvited(null)} className="text-xs text-muted hover:text-parchment">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-6">
      <p className="font-voice text-lg text-parchment">Bulk portal invite</p>
      <p className="mt-2 text-sm text-muted">
        {eligibleCount === 0
          ? "Every member already has portal access."
          : `${eligibleCount} member${eligibleCount === 1 ? " doesn't" : "s don't"} have a portal password set yet.`}
      </p>
      {error ? <p className="mt-2 text-sm text-candle">{error}</p> : null}
      {eligibleCount > 0 ? (
        <button
          onClick={handleRun}
          disabled={loading}
          className="mt-4 rounded-full bg-lilac px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft disabled:opacity-50"
        >
          {loading ? "Generating…" : `Invite ${eligibleCount} member${eligibleCount === 1 ? "" : "s"}`}
        </button>
      ) : null}
    </div>
  );
}
