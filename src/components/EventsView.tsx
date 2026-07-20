"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import EventsCalendar from "@/components/EventsCalendar";
import { buildIcsDataUrl } from "@/lib/ics";

export type EventRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  location: string | null;
  link_url: string | null;
  cover_image_url: string | null;
  registration_type: "rsvp" | "ticketing";
  status: "scheduled" | "canceled";
};

const TYPE_LABELS: Record<string, string> = {
  reading_sprint: "Reading sprint",
  tiktok_live: "TikTok live",
  author_event: "Author event",
  annual_meetup: "Annual meetup",
  other: "Event",
};

function monthLabel(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "long", year: "numeric" });
}

export default function EventsView({ events }: { events: EventRow[] }) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [listTab, setListTab] = useState<"upcoming" | "past">("upcoming");

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const upcoming = events
      .filter((e) => new Date(e.starts_at) >= now)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    const past = events
      .filter((e) => new Date(e.starts_at) < now)
      .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
    return { upcoming, past };
  }, [events]);

  const activeList = listTab === "upcoming" ? upcoming : past;

  // Group consecutive events under a month header so a growing list stays
  // scannable rather than becoming one long undifferentiated column.
  const grouped = useMemo(() => {
    const groups: { label: string; events: EventRow[] }[] = [];
    for (const event of activeList) {
      const label = monthLabel(event.starts_at);
      const current = groups[groups.length - 1];
      if (current && current.label === label) {
        current.events.push(event);
      } else {
        groups.push({ label, events: [event] });
      }
    }
    return groups;
  }, [activeList]);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-hairline p-1">
          <button
            onClick={() => setView("list")}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              view === "list" ? "bg-lilac text-ink" : "text-muted hover:text-parchment"
            }`}
          >
            List
          </button>
          <button
            onClick={() => setView("calendar")}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              view === "calendar" ? "bg-lilac text-ink" : "text-muted hover:text-parchment"
            }`}
          >
            Calendar
          </button>
        </div>

        {view === "list" ? (
          <div className="inline-flex rounded-full border border-hairline p-1">
            <button
              onClick={() => setListTab("upcoming")}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                listTab === "upcoming" ? "bg-lilac text-ink" : "text-muted hover:text-parchment"
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setListTab("past")}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                listTab === "past" ? "bg-lilac text-ink" : "text-muted hover:text-parchment"
              }`}
            >
              Past
            </button>
          </div>
        ) : null}
      </div>

      {view === "calendar" ? (
        <EventsCalendar events={events} />
      ) : activeList.length === 0 ? (
        <p className="text-sm text-muted">
          {listTab === "upcoming"
            ? "Nothing on the calendar yet. Follow us on TikTok so you don’t miss the announcement."
            : "No past events yet."}
        </p>
      ) : (
        <div className="space-y-6">
          {grouped.map((group, index) => (
            <div
              key={group.label}
              className={`rounded-2xl p-6 ${index % 2 === 1 ? "bg-white/[0.06]" : ""}`}
            >
              <p className="eyebrow mb-4">{group.label}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {group.events.map((event) => (
                  <EventCard key={event.id} event={event} isPast={listTab === "past"} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event, isPast }: { event: EventRow; isPast: boolean }) {
  const canceled = event.status === "canceled";
  const isTicketed = event.registration_type === "ticketing";

  return (
    <div
      className={`rounded-2xl border p-6 transition-colors ${
        canceled ? "border-hairline/60 opacity-60" : "border-hairline hover:border-lilac/60"
      }`}
    >
      <div className="flex gap-5">
        {event.cover_image_url ? (
          <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-surfaceRaised sm:h-40 sm:w-28">
            <Image src={event.cover_image_url} alt="" fill sizes="(min-width: 640px) 112px, 80px" className="object-cover" />
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow">{TYPE_LABELS[event.event_type] ?? "Event"}</p>
            {canceled ? (
              <span className="rounded-full border border-candle/40 px-2 py-0.5 text-[10px] text-candle">
                Canceled
              </span>
            ) : isTicketed ? (
              <span className="rounded-full border border-lilac/40 px-2 py-0.5 text-[10px] text-lilac-soft">
                Tickets
              </span>
            ) : null}
          </div>

          <p className="mt-2">
            <Link href={`/events/${event.slug}`} className="font-voice text-xl text-parchment hover:text-lilac-soft">
              {event.title}
            </Link>
          </p>
          <p className="mt-1 text-sm text-lilac-soft">
            {new Date(event.starts_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
            {event.location ? ` · ${event.location}` : " · Virtual"}
          </p>
          {event.description ? (
            <p className="mt-3 text-sm leading-relaxed text-muted">{event.description}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-4">
            {!canceled ? (
              !isPast && !isTicketed && event.link_url ? (
                <a
                  href={event.link_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-lilac px-4 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-lilac-soft"
                >
                  RSVP via TikTok
                </a>
              ) : (
                <Link
                  href={`/events/${event.slug}`}
                  className="rounded-full bg-lilac px-4 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-lilac-soft"
                >
                  {isPast ? "Details" : isTicketed ? "Get tickets" : "RSVP"}
                </Link>
              )
            ) : (
              <Link
                href={`/events/${event.slug}`}
                className="text-xs text-muted underline decoration-hairline underline-offset-2 transition-colors hover:text-lilac-soft"
              >
                More info
              </Link>
            )}
            {!canceled && !isPast ? (
              <a
                href={buildIcsDataUrl(event)}
                download={`${event.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`}
                className="text-xs text-muted underline decoration-hairline underline-offset-2 transition-colors hover:text-lilac-soft"
              >
                Add to calendar
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
