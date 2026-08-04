"use client";

import { useState } from "react";
import EventRow from "@/components/admin/EventRow";

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

/** Case-insensitive substring match across title, description, and
 * location -- an event matches if any one of the three contains the
 * query. Pure client-side filter of the already-fetched, already-scoped
 * (Upcoming or Past) events list; no new request per keystroke. */
function matchesQuery(event: Event, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  return (
    event.title.toLowerCase().includes(needle) ||
    (event.description ?? "").toLowerCase().includes(needle) ||
    (event.location ?? "").toLowerCase().includes(needle)
  );
}

export default function EventsSearchableList({
  events,
  currentUserId,
  emptyMessage,
}: {
  events: Event[];
  currentUserId: string;
  emptyMessage: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = events.filter((event) => matchesQuery(event, query));

  return (
    <div>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, description, or location…"
          className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 pr-16 text-sm text-parchment focus:border-lilac"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-parchment"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {events.length === 0 ? (
          <p className="text-sm text-muted">{emptyMessage}</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted">No events match your search.</p>
        ) : (
          filtered.map((event) => <EventRow key={event.id} event={event} currentUserId={currentUserId} />)
        )}
      </div>
    </div>
  );
}
