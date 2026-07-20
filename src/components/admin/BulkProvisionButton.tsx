"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CreatedAccount = { fullName: string; email: string; tempPassword: string; role: string };
type FailedAccount = { fullName: string; email: string; error: string };

export default function BulkProvisionButton({ eligibleCount }: { eligibleCount: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<CreatedAccount[] | null>(null);
  const [failed, setFailed] = useState<FailedAccount[]>([]);
  const [error, setError] = useState("");

  async function handleRun() {
    if (
      !confirm(
        `Create backend accounts for all ${eligibleCount} roster members who have an email but no login yet?`
      )
    ) {
      return;
    }

    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/users/bulk-provision", { method: "POST" });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Couldn't run bulk provisioning.");
      return;
    }

    const data = await res.json();
    setCreated(data.created ?? []);
    setFailed(data.failed ?? []);
    router.refresh();
  }

  if (created) {
    return (
      <div className="space-y-4 rounded-2xl border border-lilac/40 bg-surface p-6">
        <p className="font-voice text-lg text-parchment">
          {created.length === 0 ? "Nothing to create" : `Created ${created.length} account${created.length === 1 ? "" : "s"}`}
        </p>

        {created.length > 0 ? (
          <>
            <p className="text-xs text-candle">
              These temporary passwords are shown only once -- copy this now. Everyone will be
              prompted to set their own password on first login.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-muted">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Email</th>
                    <th className="pb-2 pr-4">Role</th>
                    <th className="pb-2">Temporary password</th>
                  </tr>
                </thead>
                <tbody>
                  {created.map((c) => (
                    <tr key={c.email} className="border-t border-hairline">
                      <td className="py-2 pr-4 text-parchment">{c.fullName}</td>
                      <td className="py-2 pr-4 text-muted">{c.email}</td>
                      <td className="py-2 pr-4 text-muted">{c.role}</td>
                      <td className="py-2 font-mono text-lilac-soft">{c.tempPassword}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {failed.length > 0 ? (
          <div>
            <p className="text-xs text-candle">Couldn&rsquo;t create accounts for:</p>
            <ul className="mt-1 text-xs text-muted">
              {failed.map((f) => (
                <li key={f.email}>
                  {f.fullName} ({f.email}) &mdash; {f.error}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <button
          onClick={() => setCreated(null)}
          className="text-xs text-muted hover:text-parchment"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-6">
      <p className="font-voice text-lg text-parchment">Bulk grant access</p>
      <p className="mt-2 text-sm text-muted">
        {eligibleCount === 0
          ? "Every member with an email on file already has an account."
          : `${eligibleCount} roster member${eligibleCount === 1 ? "" : "s"} with an email on file don't have login access yet. Leadership tiers (Founder/Council/Junior council) get admin access; the Member tier gets Tasks access only, without the ability to assign tasks.`}
      </p>
      {error ? <p className="mt-2 text-sm text-candle">{error}</p> : null}
      {eligibleCount > 0 ? (
        <button
          onClick={handleRun}
          disabled={loading}
          className="mt-4 rounded-full bg-lilac px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft disabled:opacity-50"
        >
          {loading ? "Creating…" : `Create ${eligibleCount} account${eligibleCount === 1 ? "" : "s"}`}
        </button>
      ) : null}
    </div>
  );
}
