"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PlannerEventForm from "@/components/admin/PlannerEventForm";

type ViewMode = "day" | "week" | "month";

type PlannerOccurrence = {
  id: string;
  occurrenceStart: string;
  occurrenceEnd: string;
  title: string;
  description: string | null;
  location: string | null;
  allDay: boolean;
  isPrivate: boolean;
  createdBy: string;
  createdByName: string;
  recurrenceRule: string | null;
  notificationLeadMinutes: number;
  syncedFromGoogle: boolean;
};

type CurrentUser = { adminUserId: string; role: string } | null;

type FormState = { eventId: string | null; initialDate?: Date; canEdit: boolean } | null;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function startOfWeek(d: Date): Date {
  return addDays(startOfDay(d), -d.getDay());
}

/** The date range to actually fetch for the current view -- for month
 * view this is the full displayed grid (including the leading/trailing
 * days from adjacent months that fill out the first/last week), not just
 * the 1st-to-last-day of the month itself. */
function getRange(viewMode: ViewMode, anchor: Date): { start: Date; end: Date } {
  if (viewMode === "day") {
    const start = startOfDay(anchor);
    return { start, end: addDays(start, 1) };
  }
  if (viewMode === "week") {
    const start = startOfWeek(anchor);
    return { start, end: addDays(start, 7) };
  }
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const lastOfMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const gridStart = startOfWeek(firstOfMonth);
  const gridEnd = addDays(startOfWeek(lastOfMonth), 7);
  return { start: gridStart, end: gridEnd };
}

function formatRangeLabel(viewMode: ViewMode, anchor: Date): string {
  if (viewMode === "day") {
    return anchor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }
  if (viewMode === "week") {
    const start = startOfWeek(anchor);
    const end = addDays(start, 6);
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function PlannerBoard({ currentUser }: { currentUser: CurrentUser }) {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [events, setEvents] = useState<PlannerOccurrence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [formState, setFormState] = useState<FormState>(null);

  const range = useMemo(() => getRange(viewMode, anchor), [viewMode, anchor]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams({ start: range.start.toISOString(), end: range.end.toISOString() });
      const res = await fetch(`/api/admin/planner/events?${params.toString()}`);
      if (!res.ok) {
        setErrorMessage("Could not load the planner.");
        return;
      }
      setEvents((await res.json()) as PlannerOccurrence[]);
    } catch {
      setErrorMessage("Could not load the planner. Check your connection.");
    } finally {
      setIsLoading(false);
    }
  }, [range.start, range.end]);

  useEffect(() => {
    load();
  }, [load]);

  function canEditEvent(event: PlannerOccurrence): boolean {
    if (!currentUser) return false;
    return event.createdBy === currentUser.adminUserId || currentUser.role === "owner";
  }

  function openCreate(initialDate?: Date) {
    setFormState({ eventId: null, initialDate, canEdit: true });
  }
  function openEdit(event: PlannerOccurrence) {
    setFormState({ eventId: event.id, canEdit: canEditEvent(event) });
  }
  function closeForm() {
    setFormState(null);
  }
  function handleSaved() {
    setFormState(null);
    load();
  }
  function handleDeleted() {
    setFormState(null);
    load();
  }

  function step(direction: -1 | 1) {
    if (viewMode === "day") setAnchor((d) => addDays(d, direction));
    else if (viewMode === "week") setAnchor((d) => addDays(d, direction * 7));
    else setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + direction, 1));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex gap-1 rounded-full border border-hairline p-1">
            {(["day", "week", "month"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`rounded-full px-3 py-1 text-xs capitalize transition-colors ${
                  viewMode === mode ? "bg-lilac text-ink" : "text-muted hover:text-parchment"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => step(-1)}
              aria-label="Previous"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-hairline text-muted hover:text-parchment"
            >
              ‹
            </button>
            <button
              onClick={() => setAnchor(new Date())}
              className="rounded-full border border-hairline px-3 py-1 text-xs text-muted hover:text-parchment"
            >
              Today
            </button>
            <button
              onClick={() => step(1)}
              aria-label="Next"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-hairline text-muted hover:text-parchment"
            >
              ›
            </button>
          </div>
          <p className="text-sm text-parchment">{formatRangeLabel(viewMode, anchor)}</p>
        </div>

        <button
          onClick={() => openCreate(anchor)}
          className="rounded-full bg-lilac px-4 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-lilac-soft"
        >
          + New event
        </button>
      </div>

      {errorMessage ? <p className="mt-4 text-sm text-candle">{errorMessage}</p> : null}

      <div className="mt-6">
        {isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : viewMode === "day" ? (
          <DayView anchor={anchor} events={events} onEventClick={openEdit} onSlotClick={openCreate} />
        ) : viewMode === "week" ? (
          <WeekView anchor={anchor} events={events} onEventClick={openEdit} onDayClick={openCreate} />
        ) : (
          <MonthView anchor={anchor} events={events} onEventClick={openEdit} onDayClick={openCreate} />
        )}
      </div>

      {formState ? (
        <PlannerEventForm
          eventId={formState.eventId}
          initialDate={formState.initialDate}
          canEdit={formState.canEdit}
          onClose={closeForm}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      ) : null}
    </div>
  );
}

function EventPill({ event, onClick }: { event: PlannerOccurrence; onClick: () => void }) {
  const time = event.allDay
    ? "All day"
    : new Date(event.occurrenceStart).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex w-full items-center gap-1 truncate rounded-md bg-lilac/20 px-2 py-1 text-left text-[11px] text-parchment transition-colors hover:bg-lilac/30"
      title={event.title}
    >
      {event.isPrivate ? <span aria-label="Private">🔒</span> : null}
      {event.syncedFromGoogle ? (
        <span className="shrink-0 rounded-full border border-hairline px-1 text-[9px] text-muted">G</span>
      ) : null}
      <span className="shrink-0 text-muted">{time}</span>
      <span className="truncate">{event.title}</span>
    </button>
  );
}

function DayView({
  anchor,
  events,
  onEventClick,
  onSlotClick,
}: {
  anchor: Date;
  events: PlannerOccurrence[];
  onEventClick: (event: PlannerOccurrence) => void;
  onSlotClick: (date: Date) => void;
}) {
  const dayEvents = events.filter((e) => sameDay(new Date(e.occurrenceStart), anchor));
  const allDayEvents = dayEvents.filter((e) => e.allDay);
  const timedEvents = dayEvents.filter((e) => !e.allDay);

  return (
    <div className="rounded-2xl border border-hairline bg-surface">
      {allDayEvents.length > 0 ? (
        <div className="space-y-1 border-b border-hairline p-3">
          {allDayEvents.map((event) => (
            <EventPill key={`${event.id}-${event.occurrenceStart}`} event={event} onClick={() => onEventClick(event)} />
          ))}
        </div>
      ) : null}
      <div className="divide-y divide-hairline">
        {HOURS.map((hour) => {
          const hourEvents = timedEvents.filter((e) => new Date(e.occurrenceStart).getHours() === hour);
          const slotDate = new Date(anchor);
          slotDate.setHours(hour, 0, 0, 0);
          return (
            <div key={hour} className="flex min-h-[44px] gap-3 px-3 py-2">
              <span className="w-14 shrink-0 pt-0.5 text-[11px] text-muted">
                {slotDate.toLocaleTimeString("en-US", { hour: "numeric" })}
              </span>
              {/* A div, not a button -- EventPill below is itself a
                  button, and nested buttons are invalid HTML (the
                  browser silently closes the outer one early, breaking
                  clicks on the pills inside it). */}
              <div className="min-h-[28px] flex-1 space-y-1" onClick={() => onSlotClick(slotDate)}>
                {hourEvents.map((event) => (
                  <EventPill key={`${event.id}-${event.occurrenceStart}`} event={event} onClick={() => onEventClick(event)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  anchor,
  events,
  onEventClick,
  onDayClick,
}: {
  anchor: Date;
  events: PlannerOccurrence[];
  onEventClick: (event: PlannerOccurrence) => void;
  onDayClick: (date: Date) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i));
  const today = new Date();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
      {days.map((day) => {
        const dayEvents = events
          .filter((e) => sameDay(new Date(e.occurrenceStart), day))
          .sort((a, b) => a.occurrenceStart.localeCompare(b.occurrenceStart));
        return (
          <div key={day.toISOString()} className="rounded-2xl border border-hairline bg-surface p-3">
            <button
              onClick={() => onDayClick(day)}
              className={`mb-2 block text-left text-xs ${sameDay(day, today) ? "font-semibold text-lilac-soft" : "text-muted"}`}
            >
              {day.toLocaleDateString("en-US", { weekday: "short", day: "numeric" })}
            </button>
            <div className="space-y-1">
              {dayEvents.length === 0 ? (
                <p className="text-[11px] text-muted/60">—</p>
              ) : (
                dayEvents.map((event) => (
                  <EventPill key={`${event.id}-${event.occurrenceStart}`} event={event} onClick={() => onEventClick(event)} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const MAX_MONTH_CELL_EVENTS = 3;

function MonthView({
  anchor,
  events,
  onEventClick,
  onDayClick,
}: {
  anchor: Date;
  events: PlannerOccurrence[];
  onEventClick: (event: PlannerOccurrence) => void;
  onDayClick: (date: Date) => void;
}) {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const lastOfMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const gridStart = startOfWeek(firstOfMonth);
  const gridEnd = addDays(startOfWeek(lastOfMonth), 7);
  const days: Date[] = [];
  for (let d = gridStart; d < gridEnd; d = addDays(d, 1)) days.push(d);
  const today = new Date();

  return (
    <div className="overflow-hidden rounded-2xl border border-hairline">
      <div className="grid grid-cols-7 border-b border-hairline bg-surface">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
          <div key={label} className="px-2 py-2 text-center text-[11px] text-muted">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const inMonth = day.getMonth() === anchor.getMonth();
          const dayEvents = events
            .filter((e) => sameDay(new Date(e.occurrenceStart), day))
            .sort((a, b) => a.occurrenceStart.localeCompare(b.occurrenceStart));
          const visible = dayEvents.slice(0, MAX_MONTH_CELL_EVENTS);
          const overflow = dayEvents.length - visible.length;

          return (
            // A div, not a button -- same reasoning as DayView's hour
            // slots: EventPill is itself a button, and buttons can't
            // nest.
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={`min-h-[92px] cursor-pointer border-b border-r border-hairline p-1.5 align-top last:border-r-0 ${
                inMonth ? "bg-surface" : "bg-ink/40"
              }`}
            >
              <span
                className={`text-[11px] ${
                  sameDay(day, today) ? "font-semibold text-lilac-soft" : inMonth ? "text-muted" : "text-muted/40"
                }`}
              >
                {day.getDate()}
              </span>
              <div className="mt-1 space-y-0.5">
                {visible.map((event) => (
                  <EventPill key={`${event.id}-${event.occurrenceStart}`} event={event} onClick={() => onEventClick(event)} />
                ))}
                {overflow > 0 ? <p className="text-[10px] text-muted">+{overflow} more</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
