"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ALL_SECTIONS, SECTION_LABELS, type AdminSection } from "@/lib/adminSections";
import HelpTip from "@/components/admin/HelpTip";

type User = {
  id: string;
  full_name: string;
  email: string;
  role: "owner" | "admin" | "editor";
  allowed_sections: string[] | null;
  member_id: string | null;
};

export default function UserRow({ user }: { user: User }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(user.role);
  const [useOverride, setUseOverride] = useState(Boolean(user.allowed_sections?.length));
  const [sectionOverride, setSectionOverride] = useState<AdminSection[]>(
    (user.allowed_sections ?? []) as AdminSection[]
  );
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    setError("");

    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        allowedSections: useOverride ? sectionOverride : undefined,
        newPassword: newPassword || undefined,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Couldn't save changes.");
      return;
    }

    setNewPassword("");
    setEditing(false);
    router.refresh();
  }

  async function handleRevoke() {
    if (!confirm(`Revoke admin access for ${user.full_name}? This deletes their login account (their member profile, if linked, is untouched).`)) {
      return;
    }
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      const body = await res.json().catch(() => null);
      alert(typeof body?.error === "string" ? body.error : "Couldn't revoke access.");
    }
  }

  if (editing) {
    return (
      <div className="space-y-4 rounded-2xl border border-hairline bg-surface p-6">
        <p className="font-voice text-lg text-parchment">{user.full_name}</p>

        <label className="block max-w-xs">
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
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
          </select>
        </label>

        <div>
          <label className="flex items-center gap-2 text-sm text-parchment">
            <input
              type="checkbox"
              checked={useOverride}
              onChange={(e) => setUseOverride(e.target.checked)}
              className="h-4 w-4 rounded border-hairline"
            />
            Custom section access instead of the role default
            <HelpTip>
              Each role comes with a default set of sections it can see. Turn this on to pick an
              exact custom set instead — useful if someone needs, say, Events access but nothing
              else, which doesn&rsquo;t match any role&rsquo;s default.
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

        <label className="block max-w-xs">
          <span className="mb-2 block text-sm text-muted">Reset password (leave blank to keep current)</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
          />
        </label>

        {error ? <p className="text-sm text-candle">{error}</p> : null}

        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={loading}
            className="rounded-full bg-lilac px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save"}
          </button>
          <button onClick={() => setEditing(false)} className="text-sm text-muted hover:text-parchment">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-2xl border border-hairline bg-surface p-4">
      <div>
        <p className="text-parchment">
          {user.full_name}
          <span className="ml-2 rounded-full border border-lilac/40 px-2 py-0.5 text-[10px] text-lilac-soft">
            {user.role}
          </span>
          {!user.member_id ? (
            <span className="ml-2 rounded-full border border-hairline px-2 py-0.5 text-[10px] text-muted">
              Not a roster member
            </span>
          ) : null}
        </p>
        <p className="text-xs text-muted">{user.email}</p>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={() => setEditing(true)} className="text-xs text-lilac-soft hover:underline">
          Edit
        </button>
        <button onClick={handleRevoke} className="text-xs text-candle hover:underline">
          Revoke
        </button>
      </div>
    </div>
  );
}
