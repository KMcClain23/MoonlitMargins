"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OrientationCheckIn from "@/components/portal/OrientationCheckIn";

type Step = { id: string; title: string; description: string | null; completed: boolean };

export default function OrientationChecklist({
  steps,
  mentorName,
  completed,
}: {
  steps: Step[];
  mentorName: string | null;
  completed: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Once orientation_completed_at is set, the checklist itself is no longer
  // relevant -- shown as a simple completion message instead of the
  // checklist rather than hiding the page entirely, so a finished member
  // who navigates back here isn't confused by a vanished page.
  if (completed) {
    return (
      <div className="rounded-2xl border border-hairline bg-surface p-6 text-center">
        <p className="font-voice text-2xl text-parchment">You&rsquo;ve completed orientation!</p>
        <p className="mt-2 text-sm text-muted">
          Welcome all the way in. There&rsquo;s nothing left to check off here.
        </p>
      </div>
    );
  }

  async function handleComplete(stepId: string) {
    setPendingId(stepId);
    const res = await fetch(`/api/portal/orientation/${stepId}/complete`, { method: "POST" });
    setPendingId(null);
    if (res.ok) {
      router.refresh();
    }
  }

  const doneCount = steps.filter((s) => s.completed).length;

  return (
    <div>
      <h1 className="font-voice text-3xl text-parchment">Orientation</h1>
      <p className="mt-1 text-sm text-muted">
        {doneCount} of {steps.length} steps complete
        {mentorName ? (
          <>
            {" "}
            &middot; Your mentor: <span className="text-lilac-soft">{mentorName}</span>
          </>
        ) : null}
      </p>

      <div className="mt-6 space-y-3">
        {steps.length === 0 ? (
          <p className="text-sm text-muted">No orientation steps have been set up yet -- check back soon.</p>
        ) : (
          steps.map((step) => (
            <label
              key={step.id}
              className="flex cursor-pointer items-start gap-3 rounded-2xl border border-hairline bg-surface p-4"
            >
              <input
                type="checkbox"
                checked={step.completed}
                disabled={step.completed || pendingId === step.id}
                onChange={() => handleComplete(step.id)}
                className="mt-1 h-4 w-4"
              />
              <div>
                <p className={step.completed ? "text-muted line-through" : "text-parchment"}>{step.title}</p>
                {step.description ? <p className="mt-1 text-xs text-muted">{step.description}</p> : null}
              </div>
            </label>
          ))
        )}
      </div>

      {/* Only shown once a mentor is actually assigned -- the send button
          has nowhere to route a check-in without one. */}
      {mentorName ? <OrientationCheckIn mentorName={mentorName} /> : null}
    </div>
  );
}
