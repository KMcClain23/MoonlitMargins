"use client";

import { useRouter } from "next/navigation";
import type { AdminRole } from "@/lib/adminSections";

const ROLE_LABELS: Record<AdminRole, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
};

export default function UserRoleFilter({ value }: { value: "all" | AdminRole }) {
  const router = useRouter();

  return (
    <label className="inline-flex items-center gap-2">
      <span className="text-xs text-muted">Role</span>
      <select
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          router.push(next === "all" ? "/admin/users" : `/admin/users?role=${next}`);
        }}
        className="rounded-full border border-hairline bg-ink px-3 py-1.5 text-xs text-parchment focus:border-lilac"
      >
        <option value="all">All roles</option>
        {(Object.keys(ROLE_LABELS) as AdminRole[]).map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </select>
    </label>
  );
}
