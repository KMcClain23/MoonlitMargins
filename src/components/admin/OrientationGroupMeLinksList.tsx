"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OrientationGroupMeLinkRow from "@/components/admin/OrientationGroupMeLinkRow";

type Link = { id: string; label: string; url: string; sort_order: number };

export default function OrientationGroupMeLinksList({ links }: { links: Link[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  // Same swap-adjacent-sort_order approach as OrientationStepsList, for
  // the same reason: simpler than renumbering the whole list.
  async function swap(a: Link, b: Link) {
    setPending(true);
    await Promise.all([
      fetch(`/api/admin/orientation-groupme-links/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: b.sort_order }),
      }),
      fetch(`/api/admin/orientation-groupme-links/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: a.sort_order }),
      }),
    ]);
    setPending(false);
    router.refresh();
  }

  if (links.length === 0) {
    return <p className="text-sm text-muted">No GroupMe links added yet.</p>;
  }

  return (
    <div className="space-y-3">
      {links.map((link, index) => {
        const previous = index > 0 ? links[index - 1] : undefined;
        const next = index < links.length - 1 ? links[index + 1] : undefined;
        return (
          <OrientationGroupMeLinkRow
            key={link.id}
            link={link}
            disabled={pending}
            onMoveUp={previous ? () => swap(link, previous) : undefined}
            onMoveDown={next ? () => swap(link, next) : undefined}
          />
        );
      })}
    </div>
  );
}
