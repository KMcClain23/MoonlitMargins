"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OrientationStepRow from "@/components/admin/OrientationStepRow";

type Step = {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  completion_type: "member" | "admin";
};

export default function OrientationStepsList({ steps }: { steps: Step[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  // Reordering swaps sort_order between two adjacent steps -- simpler than
  // renumbering the whole list, and the ORDER BY sort_order everywhere else
  // reading this table doesn't care that the values aren't contiguous.
  async function swap(a: Step, b: Step) {
    setPending(true);
    await Promise.all([
      fetch(`/api/admin/orientation-steps/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: b.sort_order }),
      }),
      fetch(`/api/admin/orientation-steps/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: a.sort_order }),
      }),
    ]);
    setPending(false);
    router.refresh();
  }

  if (steps.length === 0) {
    return <p className="text-sm text-muted">No orientation steps added yet.</p>;
  }

  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const previous = index > 0 ? steps[index - 1] : undefined;
        const next = index < steps.length - 1 ? steps[index + 1] : undefined;
        return (
          <OrientationStepRow
            key={step.id}
            step={step}
            disabled={pending}
            onMoveUp={previous ? () => swap(step, previous) : undefined}
            onMoveDown={next ? () => swap(step, next) : undefined}
          />
        );
      })}
    </div>
  );
}
