"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OrientationCheckIn from "@/components/portal/OrientationCheckIn";

type Step = {
  id: string;
  title: string;
  description: string | null;
  completionType: "member" | "admin";
  completed: boolean;
};
type GroupMeLink = { id: string; label: string; url: string };

function GroupMeLinksSection({ links }: { links: GroupMeLink[] }) {
  if (links.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="font-voice text-lg text-parchment">Join our GroupMe chats</h2>
      <div className="mt-3 flex flex-wrap gap-3">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-lilac px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft"
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

export default function OrientationChecklist({
  steps,
  mentorName,
  completed,
  groupMeLinks,
}: {
  steps: Step[];
  mentorName: string | null;
  completed: boolean;
  groupMeLinks: GroupMeLink[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Once orientation_completed_at is set, the checklist itself is no longer
  // relevant -- shown as a simple completion message instead of the
  // checklist rather than hiding the page entirely, so a finished member
  // who navigates back here isn't confused by a vanished page.
  if (completed) {
    return (
      <div>
        <div className="rounded-2xl border border-hairline bg-surface p-6 text-center">
          <p className="font-voice text-2xl text-parchment">You&rsquo;ve completed orientation!</p>
          <p className="mt-2 text-sm text-muted">
            Welcome all the way in. There&rsquo;s nothing left to check off here.
          </p>
        </div>
        <GroupMeLinksSection links={groupMeLinks} />
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
          steps.map((step) => {
            // Admin-type steps aren't self-completable (POST .../complete
            // rejects them with a 403) -- shown as a plain, non-interactive
            // row instead of a checkbox that would just silently fail to
            // check itself off.
            if (step.completionType === "admin") {
              return (
                <div key={step.id} className="flex items-start gap-3 rounded-2xl border border-hairline bg-surface p-4">
                  <span className={`mt-1 text-base ${step.completed ? "text-lilac-soft" : "text-muted"}`}>
                    {step.completed ? "✓" : "○"}
                  </span>
                  <div>
                    <p className={step.completed ? "text-muted line-through" : "text-parchment"}>{step.title}</p>
                    {step.description ? <p className="mt-1 text-xs text-muted">{step.description}</p> : null}
                    <p className="mt-1 text-[11px] text-muted/70">
                      {step.completed ? "Completed by an admin" : "An admin will mark this complete"}
                    </p>
                  </div>
                </div>
              );
            }

            return (
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
            );
          })
        )}
      </div>

      {/* Only shown once a mentor is actually assigned -- the send button
          has nowhere to route a check-in without one. */}
      {mentorName ? <OrientationCheckIn mentorName={mentorName} /> : null}

      <GroupMeLinksSection links={groupMeLinks} />
    </div>
  );
}
