"use client";

import { useState } from "react";

type Rsvp = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
};

export default function AdminRsvpList({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rsvps, setRsvps] = useState<Rsvp[] | null>(null);

  async function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (rsvps === null) {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/events/${eventId}/rsvps`);
        const body = await res.json();
        setRsvps(body.rsvps ?? []);
      } catch {
        setRsvps([]);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div>
      <button onClick={handleToggle} className="text-xs text-lilac-soft hover:underline">
        {open ? "Hide RSVPs" : rsvps ? `RSVPs (${rsvps.length})` : "View RSVPs"}
      </button>

      {open ? (
        <div className="mt-2 space-y-1.5 rounded-lg border border-hairline bg-ink p-3">
          {loading ? (
            <p className="text-xs text-muted">Loading…</p>
          ) : rsvps && rsvps.length > 0 ? (
            rsvps.map((rsvp) => (
              <p key={rsvp.id} className="text-xs text-muted">
                <span className="text-parchment">
                  {rsvp.first_name} {rsvp.last_name}
                </span>{" "}
                &middot; {rsvp.email} &middot;{" "}
                {new Date(rsvp.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
              </p>
            ))
          ) : (
            <p className="text-xs text-muted">No RSVPs yet.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
