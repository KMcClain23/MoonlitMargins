"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ALL_SECTIONS, SECTION_LABELS, sectionsForRole, type AdminSection, type AdminRole } from "@/lib/adminSections";
import HelpTip from "@/components/admin/HelpTip";

type User = {
  id: string;
  full_name: string;
  email: string;
  role: AdminRole;
  allowed_sections: string[] | null;
  member_id: string | null;
};

export default function UserRow({ user }: { user: User }) {
  const router = useRouter();
  const [role, setRole] = useState<AdminRole>(user.role);
  const [sections, setSections] = useState<AdminSection[]>(sectionsForRole(user.role, user.allowed_sections));
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState("");

  const [resettingPassword, setResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetStatus, setResetStatus] = useState<"idle" | "loading" | "error">("idle");
  const [resetError, setResetError] = useState("");

  async function persist(nextRole: AdminRole, nextSections: AdminSection[]) {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole, allowedSections: nextSections }),
    });
    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Couldn't save that change.");
      // Roll back to the last known-good state so the UI doesn't show a
      // change that didn't actually take effect (e.g. the last-owner guard).
      setRole(user.role);
      setSections(sectionsForRole(user.role, user.allowed_sections));
      return;
    }

    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
    router.refresh();
  }

  function handleRoleChange(nextRole: AdminRole) {
    setRole(nextRole);
    persist(nextRole, sections);
  }

  function handleSectionToggle(section: AdminSection, checked: boolean) {
    const next = checked ? [...sections, section] : sections.filter((s) => s !== section);
    setSections(next);
    persist(role, next);
  }

  async function handleResetPassword() {
    setResetStatus("loading");
    setResetError("");
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, allowedSections: sections, newPassword }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setResetStatus("error");
      setResetError(typeof body?.error === "string" ? body.error : "Couldn't reset that password.");
      return;
    }

    setResetStatus("idle");
    setNewPassword("");
    setResettingPassword(false);
    router.refresh();
  }

  async function handleRevoke() {
    if (
      !confirm(
        `Revoke admin access for ${user.full_name}? This deletes their login account (their member profile, if linked, is untouched).`
      )
    ) {
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

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-parchment">
            {user.full_name}
            {!user.member_id ? (
              <span className="ml-2 rounded-full border border-hairline px-2 py-0.5 text-[10px] text-muted">
                Not a roster member
              </span>
            ) : null}
          </p>
          <p className="text-xs text-muted">{user.email}</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center text-xs text-muted">
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
                <strong>Editor</strong> — limited to Events, Memories, and Tasks by default.
                Toggle sections below to customize.
              </p>
            </HelpTip>
          </span>
          <select
            value={role}
            onChange={(e) => handleRoleChange(e.target.value as AdminRole)}
            className="rounded-full border border-hairline bg-ink px-3 py-1 text-xs text-parchment focus:border-lilac"
          >
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
          </select>
          <button
            onClick={() => setResettingPassword((v) => !v)}
            className="text-xs text-lilac-soft hover:underline"
          >
            Reset password
          </button>
          <button onClick={handleRevoke} className="text-xs text-candle hover:underline">
            Revoke
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-hairline pt-3">
        {ALL_SECTIONS.map((section) => (
          <label key={section} className="flex items-center gap-1.5 text-xs text-parchment">
            <input
              type="checkbox"
              checked={sections.includes(section)}
              onChange={(e) => handleSectionToggle(section, e.target.checked)}
              className="h-3.5 w-3.5 rounded border-hairline"
            />
            {SECTION_LABELS[section]}
          </label>
        ))}
        {saving ? <span className="text-[10px] text-muted">Saving…</span> : null}
        {!saving && justSaved ? <span className="text-[10px] text-lilac-soft">Saved</span> : null}
      </div>

      {error ? <p className="mt-2 text-xs text-candle">{error}</p> : null}

      {resettingPassword ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-hairline pt-3">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (min 8 characters)"
            minLength={8}
            className="w-full max-w-xs rounded-lg border border-hairline bg-ink px-3 py-1.5 text-xs text-parchment focus:border-lilac"
          />
          <button
            onClick={handleResetPassword}
            disabled={resetStatus === "loading" || newPassword.length < 8}
            className="rounded-full bg-lilac px-4 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-lilac-soft disabled:opacity-50"
          >
            {resetStatus === "loading" ? "Resetting…" : "Reset"}
          </button>
          <button
            onClick={() => {
              setResettingPassword(false);
              setNewPassword("");
              setResetStatus("idle");
            }}
            className="text-xs text-muted hover:text-parchment"
          >
            Cancel
          </button>
          {resetStatus === "error" ? <p className="w-full text-xs text-candle">{resetError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
