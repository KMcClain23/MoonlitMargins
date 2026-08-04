"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** The admin-side counterpart to a member checking off their own step --
 * only ever rendered for completion_type "admin" steps (see the Members in
 * progress section of /admin/orientation), since member-type steps are
 * read-only here (the member does those themselves). */
export default function AdminOrientationStepCompleteButton({
  memberId,
  stepId,
}: {
  memberId: string;
  stepId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const res = await fetch(`/api/admin/orientation/${memberId}/steps/${stepId}/complete`, { method: "POST" });
    setLoading(false);
    if (res.ok) {
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-full border border-lilac/40 px-3 py-1 text-[11px] text-lilac-soft transition-colors hover:border-lilac disabled:opacity-50"
    >
      {loading ? "Marking…" : "Mark complete"}
    </button>
  );
}
