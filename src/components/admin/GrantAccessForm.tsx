"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ALL_SECTIONS, SECTION_LABELS, type AdminSection } from "@/lib/adminSections";
import HelpTip from "@/components/admin/HelpTip";

export default function GrantAccessForm({ members }: { members: { id: string; full_name: string }[] }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [memberId, setMemberId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"owner" | "admin" | "editor">("editor");
  const [sectionOverride, setSectionOverride] = useState<AdminSection[]>([]);
  const [useOverride, setUseOverride] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleMemberSelect(id: string) {
    setMemberId(id);
    const match = members.find((m) => m.id === id);
    if (match && !fullName) setFullName(match.full_name);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        email,
        password,
        role,
        memberId: memberId || undefined,
        allowedSections: useOverride ? sectionOverride : undefined,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Couldn't create that account.");
      return;
    }

    setFullName("");
    setMemberId("");
    setEmail("");
    setPassword("");
    setRole("editor");
    setSectionOverride([]);
    setUseOverride(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-hairline bg-surface p-6">
      <p className="font-voice text-lg text-parchment">New admin account</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 flex items-center text-sm text-muted">
            Link to a member (optional)
            <HelpTip>
              Connects this login to a real sisterhood roster profile — use this for someone
              who&rsquo;s both a member and an admin (like a council member helping run the
              site). Leave it unlinked for someone with backend access who isn&rsquo;t part of
              the public roster, like the site&rsquo;s developer.
            </HelpTip>
          </span>
          <select
            value={memberId}
            onChange={(e) => handleMemberSelect(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
          >
            <option value="">Not linked to a member</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-muted">Full name</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
          />
        </label>

        <label className="block">
          <span className="mb-2 flex items-center text-sm text-muted">
            Role
            <HelpTip>
              <p className="text-parchment">
                <strong>Owner</strong> — full access, plus creating and managing other admin
                accounts and permissions.
              </p>
              <p className="mt-2 text-parchment">
                <strong>Admin</strong> — full access to Applications, Events, Members, Memories,
                and Tasks. Cannot manage other users.
              </p>
              <p className="mt-2 text-parchment">
                <strong>Editor</strong> — limited to Events, Memories, and Tasks by default. Use
                the custom section option below to change that.
              </p>
            </HelpTip>
          </span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
          >
            <option value="owner">Owner (full access, manages other admins)</option>
            <option value="admin">Admin (full access except managing users)</option>
            <option value="editor">Editor (limited sections)</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-muted">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-muted">Initial password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
          />
        </label>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm text-parchment">
          <input
            type="checkbox"
            checked={useOverride}
            onChange={(e) => setUseOverride(e.target.checked)}
            className="h-4 w-4 rounded border-hairline"
          />
          Give this person a custom set of sections instead of the role default
          <HelpTip>
            Each role comes with a default set of sections it can see (explained above). Turn
            this on to pick an exact custom set instead — useful if someone needs, say, Events
            access but nothing else, which doesn&rsquo;t match any role&rsquo;s default.
          </HelpTip>
        </label>

        {useOverride ? (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ALL_SECTIONS.map((section) => (
              <label key={section} className="flex items-center gap-2 text-sm text-parchment">
                <input
                  type="checkbox"
                  checked={sectionOverride.includes(section)}
                  onChange={(e) =>
                    setSectionOverride((current) =>
                      e.target.checked ? [...current, section] : current.filter((s) => s !== section)
                    )
                  }
                  className="h-4 w-4 rounded border-hairline"
                />
                {SECTION_LABELS[section]}
              </label>
            ))}
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-candle">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-lilac px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}
