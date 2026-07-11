"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type EventRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  location: string | null;
  link_url: string | null;
  cover_image_url: string | null;
  status: "scheduled" | "canceled";
};

const TYPE_LABELS: Record<string, string> = {
  reading_sprint: "Reading sprint",
  tiktok_live: "TikTok live",
  author_event: "Author event",
  annual_meetup: "Annual meetup",
  other: "Event",
};

// Each event type gets a distinct pill color so the month grid is
// scannable at a glance without opening a day.
const TYPE_PILL: Record<string, string> = {
  reading_sprint: "bg-lilac/20 text-lilac-soft",
  tiktok_live: "bg-candle/20 text-candle",
  author_event: "bg-parchment/15 text-parchment",
  annual_meetup: "bg-lilac/30 text-lilac-soft",
  other: "bg-muted/20 text-muted",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE_PER_DAY = 2;

export default function EventsCalendar({ events }: { events: EventRow[] }) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const event of events) {
      const d = new Date(event.starts_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<{ day: number; key: string } | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, key: `${year}-${month}-${day}` });
  }

  const selectedEvents = selectedDay ? eventsByDay.get(selectedDay) ?? [] : [];

  useEffect(() => {
    if (!selectedDay) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedDay(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDay]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            setCursor(new Date(year, month - 1, 1));
            setSelectedDay(null);
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:border-parchment hover:text-parchment"
          aria-label="Previous month"
        >
          ←
        </button>
        <p className="font-voice text-xl text-parchment">
          {cursor.toLocaleString("en-US", { month: "long", year: "numeric" })}
        </p>
        <button
          onClick={() => {
            setCursor(new Date(year, month + 1, 1));
            setSelectedDay(null);
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:border-parchment hover:text-parchment"
          aria-label="Next month"
        >
          →
        </button>
      </div>

      <div className="mt-8 grid grid-cols-7 gap-2">
        {WEEKDAYS.map((wd) => (
          <p key={wd} className="pb-1 text-center text-xs uppercase tracking-wide text-muted">
            {wd}
          </p>
        ))}

        {cells.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} />;

          const dayEvents = eventsByDay.get(cell.key) ?? [];
          const hasEvents = dayEvents.length > 0;
          const hiddenCount = dayEvents.length - MAX_VISIBLE_PER_DAY;
          const isToday =
            cell.day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const isSelected = selectedDay === cell.key;

          return (
            <button
              key={cell.key}
              onClick={() => setSelectedDay(hasEvents ? cell.key : null)}
              disabled={!hasEvents}
              className={`flex min-h-[92px] flex-col items-start gap-1 rounded-xl border p-2 text-left transition-colors sm:min-h-[104px] sm:p-2.5 ${
                isSelected
                  ? "border-lilac bg-lilac/10"
                  : isToday
                    ? "border-candle/60 bg-candle/5"
                    : "border-hairline bg-surface/40"
              } ${hasEvents ? "cursor-pointer hover:border-lilac/50 hover:bg-surface" : "cursor-default"}`}
            >
              <span
                className={`text-xs ${
                  isToday ? "font-medium text-candle" : "text-muted"
                }`}
              >
                {cell.day}
              </span>
              {hasEvents ? (
                <div className="flex w-full flex-col gap-1">
                  {dayEvents.slice(0, MAX_VISIBLE_PER_DAY).map((e) => (
                    <span
                      key={e.id}
                      className={`truncate rounded px-1.5 py-0.5 text-[11px] leading-tight ${
                        e.status === "canceled"
                          ? "bg-muted/10 text-muted line-through"
                          : (TYPE_PILL[e.event_type] ?? "bg-muted/20 text-muted")
                      }`}
                    >
                      {e.title}
                    </span>
                  ))}
                  {hiddenCount > 0 ? (
                    <span className="px-1.5 text-[11px] text-muted">+{hiddenCount} more</span>
                  ) : null}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      {selectedDay && selectedEvents.length > 0 && selectedEvents[0] ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-hairline bg-surface p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="eyebrow">
                {new Date(selectedEvents[0].starts_at).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <button
                onClick={() => setSelectedDay(null)}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:border-parchment hover:text-parchment"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3">
              {selectedEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
                  className={`flex gap-4 rounded-2xl border border-hairline bg-surfaceRaised p-4 transition-colors hover:border-lilac/60 ${
                    event.status === "canceled" ? "opacity-60" : ""
                  }`}
                >
                  {event.cover_image_url ? (
                    <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-ink">
                      <Image src={event.cover_image_url} alt="" fill sizes="64px" className="object-cover" />
                    </div>
                  ) : null}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="eyebrow mb-1">{TYPE_LABELS[event.event_type] ?? "Event"}</p>
                      {event.status === "canceled" ? (
                        <span className="mb-1 rounded-full border border-candle/40 px-2 py-0.5 text-[10px] text-candle">
                          Canceled
                        </span>
                      ) : null}
                    </div>
                    <p className="font-voice text-lg text-parchment">{event.title}</p>
                    <p className="mt-1 text-sm text-lilac-soft">
                      {new Date(event.starts_at).toLocaleTimeString("en-US", { timeStyle: "short" })}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                    {event.description ? (
                      <p className="mt-2 text-sm leading-relaxed text-muted">{event.description}</p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
