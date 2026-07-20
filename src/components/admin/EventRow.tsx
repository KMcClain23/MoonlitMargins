"use client";

import { useState } from "react";
import EventForm from "@/components/admin/EventForm";
import DeleteButton from "@/components/admin/DeleteButton";
import AdminRsvpList from "@/components/admin/AdminRsvpList";
import EventComments from "@/components/admin/EventComments";

type Event = {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  location: string | null;
  link_url: string | null;
  registration_type: "rsvp" | "ticketing";
  status: "scheduled" | "canceled";
  is_private?: boolean;
  target_tiers?: string[] | null;
};

const TIER_LABELS: Record<string, string> = {
  founder: "Founder",
  council: "Council",
  junior_council: "Junior council",
  member: "Member",
};

export default function EventRow({ event, currentUserId }: { event: Event; currentUserId: string }) {
  const [editing, setEditing] = useState(false);
  const [showComments, setShowComments] = useState(false);

  if (editing) {
    return <EventForm event={event} onDone={() => setEditing(false)} />;
  }

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-parchment">
            {event.title}
            {event.status === "canceled" ? (
              <span className="ml-2 rounded-full border border-candle/40 px-2 py-0.5 text-[10px] text-candle">
                Canceled
              </span>
            ) : null}
            {event.registration_type === "ticketing" ? (
              <span className="ml-2 rounded-full border border-lilac/40 px-2 py-0.5 text-[10px] text-lilac-soft">
                Ticketed
              </span>
            ) : null}
            {event.is_private ? (
              <span className="ml-2 rounded-full border border-hairline px-2 py-0.5 text-[10px] text-muted">
                Private{event.target_tiers?.length ? `: ${event.target_tiers.map((t) => TIER_LABELS[t] ?? t).join(", ")}` : ""}
              </span>
            ) : null}
          </p>
          <p className="text-xs text-muted">
            {new Date(event.starts_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
            {event.location ? ` · ${event.location}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setEditing(true)} className="text-xs text-lilac-soft hover:underline">
            Edit
          </button>
          <DeleteButton endpoint={`/api/admin/events/${event.id}`} />
        </div>
      </div>

      {event.registration_type === "rsvp" && event.status !== "canceled" ? (
        <div className="mt-3">
          <AdminRsvpList eventId={event.id} />
        </div>
      ) : null}

      <div className="mt-3">
        <button onClick={() => setShowComments((v) => !v)} className="text-xs text-lilac-soft hover:underline">
          {showComments ? "Hide comments" : "Comments"}
        </button>
        {showComments ? (
          <div className="mt-2">
            <EventComments eventId={event.id} currentUserId={currentUserId} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
