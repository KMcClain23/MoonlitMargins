"use client";

import { useState } from "react";
import OrientationGroupMeLinkForm from "@/components/admin/OrientationGroupMeLinkForm";
import DeleteButton from "@/components/admin/DeleteButton";

type Link = { id: string; label: string; url: string; sort_order: number };

export default function OrientationGroupMeLinkRow({
  link,
  disabled,
  onMoveUp,
  onMoveDown,
}: {
  link: Link;
  disabled: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <OrientationGroupMeLinkForm
        link={{ id: link.id, label: link.label, url: link.url }}
        onDone={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-hairline bg-surface p-4">
      <div className="flex gap-3">
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <button
            onClick={onMoveUp}
            disabled={disabled || !onMoveUp}
            aria-label="Move up"
            className="text-muted transition-colors hover:text-parchment disabled:opacity-30"
          >
            ▲
          </button>
          <button
            onClick={onMoveDown}
            disabled={disabled || !onMoveDown}
            aria-label="Move down"
            className="text-muted transition-colors hover:text-parchment disabled:opacity-30"
          >
            ▼
          </button>
        </div>
        <div>
          <p className="text-parchment">{link.label}</p>
          <p className="mt-1 truncate text-xs text-muted">{link.url}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <button onClick={() => setEditing(true)} className="text-xs text-lilac-soft hover:underline">
          Edit
        </button>
        <DeleteButton endpoint={`/api/admin/orientation-groupme-links/${link.id}`} />
      </div>
    </div>
  );
}
