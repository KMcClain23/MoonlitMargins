"use client";

import { useState } from "react";
import OrientationStepForm from "@/components/admin/OrientationStepForm";
import DeleteButton from "@/components/admin/DeleteButton";

type Step = { id: string; title: string; description: string | null; sort_order: number };

export default function OrientationStepRow({
  step,
  disabled,
  onMoveUp,
  onMoveDown,
}: {
  step: Step;
  disabled: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <OrientationStepForm step={step} onDone={() => setEditing(false)} />;
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
          <p className="text-parchment">{step.title}</p>
          {step.description ? <p className="mt-1 text-xs text-muted">{step.description}</p> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <button onClick={() => setEditing(true)} className="text-xs text-lilac-soft hover:underline">
          Edit
        </button>
        <DeleteButton endpoint={`/api/admin/orientation-steps/${step.id}`} />
      </div>
    </div>
  );
}
