"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type MentorOption = { id: string; full_name: string };

/**
 * The one place mentor assignment is editable -- moved here from
 * MemberForm.tsx so there's a single control for this field, not two.
 * PATCHes the member directly (own dedicated route, not the general
 * member-save route) so this stays a true single-field update.
 */
export default function MentorAssignmentSelect({
  memberId,
  mentorAdminUserId,
  mentorOptions,
}: {
  memberId: string;
  mentorAdminUserId: string | null;
  mentorOptions: MentorOption[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setSaving(true);
    await fetch(`/api/admin/members/${memberId}/mentor`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mentorAdminUserId: event.target.value || null }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <select
      defaultValue={mentorAdminUserId ?? ""}
      onChange={handleChange}
      disabled={saving}
      className="rounded-full border border-hairline bg-ink px-3 py-1.5 text-xs text-parchment focus:border-lilac disabled:opacity-50"
    >
      <option value="">Unassigned</option>
      {mentorOptions.map((m) => (
        <option key={m.id} value={m.id}>
          {m.full_name}
        </option>
      ))}
    </select>
  );
}
