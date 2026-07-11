"use client";

import { useState } from "react";
import RsvpForm from "@/components/RsvpForm";

const linkButtonClass =
  "inline-flex items-center justify-center rounded-full bg-lilac px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft";

export default function EventRsvpSection({
  eventId,
  registrationType,
  status,
  isPast,
  linkUrl,
}: {
  eventId: string;
  registrationType: "rsvp" | "ticketing";
  status: "scheduled" | "canceled";
  isPast: boolean;
  linkUrl: string | null;
}) {
  const [open, setOpen] = useState(false);

  if (status === "canceled") {
    return (
      <p className="rounded-2xl border border-candle/30 bg-surface px-6 py-4 text-sm text-candle">
        This event has been canceled.
      </p>
    );
  }

  if (isPast) {
    return linkUrl ? (
      <a href={linkUrl} target="_blank" rel="noreferrer" className={linkButtonClass}>
        Watch the replay
      </a>
    ) : (
      <p className="text-sm text-muted">This event has already happened.</p>
    );
  }

  if (registrationType === "ticketing") {
    return linkUrl ? (
      <a href={linkUrl} target="_blank" rel="noreferrer" className={linkButtonClass}>
        Get tickets
      </a>
    ) : (
      <p className="text-sm text-muted">Ticket details coming soon — check back or follow us on TikTok.</p>
    );
  }

  if (open) {
    return <RsvpForm eventId={eventId} />;
  }

  return (
    <button onClick={() => setOpen(true)} className={linkButtonClass}>
      RSVP
    </button>
  );
}
