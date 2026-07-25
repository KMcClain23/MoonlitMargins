"use client";

import { useEffect, useState, FormEvent } from "react";

type RecurrenceFreq = "none" | "daily" | "weekly" | "monthly";
type RecurrenceEnd = "never" | "count" | "until";

const WEEKDAYS: { code: string; label: string }[] = [
  { code: "MO", label: "M" },
  { code: "TU", label: "T" },
  { code: "WE", label: "W" },
  { code: "TH", label: "T" },
  { code: "FR", label: "F" },
  { code: "SA", label: "S" },
  { code: "SU", label: "S" },
];

// Hand-built RRULE string construction/parsing for exactly the patterns
// this picker exposes (None/Daily/Weekly+days/Monthly, never/count/until)
// -- deliberately not using the rrule library here, since this is simple
// string assembly, not the recurrence-expansion math it exists for
// (that math lives server-side, see src/app/api/admin/planner/events).
function buildRecurrenceRule(
  freq: RecurrenceFreq,
  days: string[],
  end: RecurrenceEnd,
  count: number,
  until: string
): string | null {
  if (freq === "none") return null;
  const parts = [`FREQ=${freq.toUpperCase()}`];
  if (freq === "weekly" && days.length > 0) {
    parts.push(`BYDAY=${days.join(",")}`);
  }
  if (end === "count" && count > 0) {
    parts.push(`COUNT=${count}`);
  } else if (end === "until" && until) {
    // until is a plain "YYYY-MM-DD" date-input value; RRULE's UNTIL
    // wants a UTC "YYYYMMDDTHHMMSSZ" stamp -- end of that day, inclusive.
    const stamp = `${until.replace(/-/g, "")}T235959Z`;
    parts.push(`UNTIL=${stamp}`);
  }
  return parts.join(";");
}

function parseRecurrenceRule(rule: string | null): {
  freq: RecurrenceFreq;
  days: string[];
  end: RecurrenceEnd;
  count: number;
  until: string;
} {
  const fallback = { freq: "none" as RecurrenceFreq, days: [] as string[], end: "never" as RecurrenceEnd, count: 10, until: "" };
  if (!rule) return fallback;

  const params: Record<string, string> = {};
  for (const part of rule.split(";")) {
    const [key, value] = part.split("=");
    if (key && value) params[key] = value;
  }

  const freqRaw = params.FREQ?.toLowerCase();
  const freq: RecurrenceFreq =
    freqRaw === "daily" || freqRaw === "weekly" || freqRaw === "monthly" ? freqRaw : "none";
  const days = params.BYDAY ? params.BYDAY.split(",") : [];

  if (params.COUNT) {
    return { freq, days, end: "count", count: Number(params.COUNT) || 10, until: "" };
  }
  if (params.UNTIL) {
    const m = params.UNTIL.match(/^(\d{4})(\d{2})(\d{2})/);
    return { freq, days, end: "until", count: 10, until: m ? `${m[1]}-${m[2]}-${m[3]}` : "" };
  }
  return { freq, days, end: "never", count: 10, until: "" };
}

// datetime-local inputs use local-time "YYYY-MM-DDTHH:mm", no timezone --
// converted to a real UTC ISO string here so it means the same instant
// regardless of whoever's viewing it, matching what the planner backend
// already assumes throughout (new Date(...), .toISOString(), rrule's
// dtstart).
function toDatetimeLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}

type PlannerEventDetail = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startTime: string;
  endTime: string;
  allDay: boolean;
  isPrivate: boolean;
  createdBy: string;
  recurrenceRule: string | null;
  notificationLeadMinutes: number;
  syncedFromGoogle: boolean;
};

export default function PlannerEventForm({
  eventId,
  initialDate,
  canEdit,
  onClose,
  onSaved,
  onDeleted,
}: {
  /** Editing an existing event when set; creating a new one when null. */
  eventId?: string | null;
  /** Pre-fills the start date/time when creating (e.g. the day cell that
   * was clicked) -- ignored once an existing event has loaded. */
  initialDate?: Date;
  /** Whether the current user can actually save/delete this event --
   * matches the backend's own creator-or-owner check. Always true when
   * creating (anyone with planner access can create). Read-only view
   * when false on an existing event, rather than a form that would just
   * 403 on submit. */
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const isEditing = Boolean(eventId);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [loadError, setLoadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [syncedFromGoogle, setSyncedFromGoogle] = useState(false);

  const defaultStart = initialDate ?? new Date();
  const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [notificationLeadMinutes, setNotificationLeadMinutes] = useState(30);
  const [startInput, setStartInput] = useState(toDatetimeLocalInput(defaultStart.toISOString()));
  const [endInput, setEndInput] = useState(toDatetimeLocalInput(defaultEnd.toISOString()));

  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceFreq>("none");
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>([]);
  const [recurrenceEnd, setRecurrenceEnd] = useState<RecurrenceEnd>("never");
  const [recurrenceCount, setRecurrenceCount] = useState(10);
  const [recurrenceUntil, setRecurrenceUntil] = useState("");

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    setIsLoading(true);
    setLoadError("");
    fetch(`/api/admin/planner/events/${eventId}`)
      .then((res) => (res.ok ? (res.json() as Promise<PlannerEventDetail>) : Promise.reject(res)))
      .then((data) => {
        if (cancelled) return;
        setTitle(data.title);
        setDescription(data.description ?? "");
        setLocation(data.location ?? "");
        setAllDay(data.allDay);
        setIsPrivate(data.isPrivate);
        setNotificationLeadMinutes(data.notificationLeadMinutes);
        setSyncedFromGoogle(data.syncedFromGoogle);
        setStartInput(data.allDay ? toDateInput(data.startTime) : toDatetimeLocalInput(data.startTime));
        setEndInput(data.allDay ? toDateInput(data.endTime) : toDatetimeLocalInput(data.endTime));
        const parsed = parseRecurrenceRule(data.recurrenceRule);
        setRecurrenceFreq(parsed.freq);
        setRecurrenceDays(parsed.days);
        setRecurrenceEnd(parsed.end);
        setRecurrenceCount(parsed.count);
        setRecurrenceUntil(parsed.until);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Couldn't load that event.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const readOnly = isEditing && !canEdit;

  function toggleDay(code: string) {
    setRecurrenceDays((current) => (current.includes(code) ? current.filter((d) => d !== code) : [...current, code]));
  }

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (readOnly) return;
    setIsSubmitting(true);
    setError("");

    const startTime = allDay ? new Date(`${startInput}T00:00:00`).toISOString() : new Date(startInput).toISOString();
    const endTime = allDay ? new Date(`${endInput}T00:00:00`).toISOString() : new Date(endInput).toISOString();

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      startTime,
      endTime,
      allDay,
      isPrivate,
      recurrenceRule: buildRecurrenceRule(recurrenceFreq, recurrenceDays, recurrenceEnd, recurrenceCount, recurrenceUntil) ?? undefined,
      notificationLeadMinutes,
    };

    const url = isEditing ? `/api/admin/planner/events/${eventId}` : "/api/admin/planner/events";
    const method = isEditing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsSubmitting(false);

    if (!res.ok) {
      setError(`Couldn't ${isEditing ? "save" : "create"} that event. Check the fields and try again.`);
      return;
    }

    onSaved();
  }

  async function handleDelete() {
    if (!eventId) return;
    setIsDeleting(true);
    setError("");
    const res = await fetch(`/api/admin/planner/events/${eventId}`, { method: "DELETE" });
    setIsDeleting(false);
    if (!res.ok) {
      setError("Couldn't delete that event.");
      return;
    }
    onDeleted();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 px-4 py-8" onClick={onClose}>
      <div
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl border border-hairline bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-voice text-lg text-parchment">
            {isLoading ? "Loading…" : isEditing ? (readOnly ? "Event" : "Edit event") : "New event"}
          </p>
          <button type="button" onClick={onClose} className="text-xs text-muted hover:text-parchment">
            Close
          </button>
        </div>

        {syncedFromGoogle ? (
          <p className="mt-2 inline-block rounded-full border border-hairline px-2.5 py-1 text-[10px] text-muted">
            Created in Google Calendar
          </p>
        ) : null}

        {isLoading ? null : loadError ? (
          <p className="mt-4 text-sm text-candle">{loadError}</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <fieldset disabled={readOnly} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm text-muted">Title</span>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac disabled:opacity-60"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-muted">Description</span>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac disabled:opacity-60"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-muted">Location</span>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac disabled:opacity-60"
                />
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setAllDay(next);
                    // Re-anchor the two inputs to their own value's date
                    // part when switching format, rather than leaving
                    // whatever the other input type's string happened to
                    // look like.
                    setStartInput((current) => (next ? current.slice(0, 10) : `${current.slice(0, 10)}T09:00`));
                    setEndInput((current) => (next ? current.slice(0, 10) : `${current.slice(0, 10)}T10:00`));
                  }}
                  className="h-4 w-4 rounded border-hairline"
                />
                <span className="text-sm text-muted">All-day</span>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm text-muted">Start</span>
                  <input
                    required
                    type={allDay ? "date" : "datetime-local"}
                    value={startInput}
                    onChange={(e) => setStartInput(e.target.value)}
                    className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac disabled:opacity-60"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm text-muted">End</span>
                  <input
                    required
                    type={allDay ? "date" : "datetime-local"}
                    value={endInput}
                    onChange={(e) => setEndInput(e.target.value)}
                    className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac disabled:opacity-60"
                  />
                </label>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="h-4 w-4 rounded border-hairline"
                />
                <span className="text-sm text-muted">Private (only visible to you)</span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-muted">Remind me before (minutes)</span>
                <input
                  type="number"
                  min={0}
                  value={notificationLeadMinutes}
                  onChange={(e) => setNotificationLeadMinutes(Number(e.target.value) || 0)}
                  className="w-32 rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac disabled:opacity-60"
                />
              </label>

              <div className="rounded-lg border border-hairline p-4">
                <span className="mb-2 block text-sm text-muted">Repeats</span>
                <div className="flex flex-wrap gap-2">
                  {(["none", "daily", "weekly", "monthly"] as RecurrenceFreq[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      disabled={readOnly}
                      onClick={() => setRecurrenceFreq(f)}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        recurrenceFreq === f
                          ? "border-lilac bg-lilac text-ink"
                          : "border-hairline text-muted hover:text-parchment"
                      }`}
                    >
                      {f === "none" ? "Never" : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>

                {recurrenceFreq === "weekly" ? (
                  <div className="mt-3 flex gap-1.5">
                    {WEEKDAYS.map((day) => (
                      <button
                        key={day.code}
                        type="button"
                        disabled={readOnly}
                        onClick={() => toggleDay(day.code)}
                        className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] transition-colors ${
                          recurrenceDays.includes(day.code)
                            ? "border-lilac bg-lilac text-ink"
                            : "border-hairline text-muted hover:text-parchment"
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                ) : null}

                {recurrenceFreq !== "none" ? (
                  <div className="mt-3 space-y-2">
                    <span className="block text-xs text-muted">Ends</span>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-parchment">
                        <input
                          type="radio"
                          name="recurrenceEnd"
                          disabled={readOnly}
                          checked={recurrenceEnd === "never"}
                          onChange={() => setRecurrenceEnd("never")}
                        />
                        Never
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-parchment">
                        <input
                          type="radio"
                          name="recurrenceEnd"
                          disabled={readOnly}
                          checked={recurrenceEnd === "count"}
                          onChange={() => setRecurrenceEnd("count")}
                        />
                        After
                        <input
                          type="number"
                          min={1}
                          disabled={readOnly || recurrenceEnd !== "count"}
                          value={recurrenceCount}
                          onChange={(e) => setRecurrenceCount(Number(e.target.value) || 1)}
                          className="w-16 rounded border border-hairline bg-ink px-2 py-1 text-xs text-parchment disabled:opacity-60"
                        />
                        occurrences
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-parchment">
                        <input
                          type="radio"
                          name="recurrenceEnd"
                          disabled={readOnly}
                          checked={recurrenceEnd === "until"}
                          onChange={() => setRecurrenceEnd("until")}
                        />
                        On
                        <input
                          type="date"
                          disabled={readOnly || recurrenceEnd !== "until"}
                          value={recurrenceUntil}
                          onChange={(e) => setRecurrenceUntil(e.target.value)}
                          className="rounded border border-hairline bg-ink px-2 py-1 text-xs text-parchment disabled:opacity-60"
                        />
                      </label>
                    </div>
                  </div>
                ) : null}
              </div>
            </fieldset>

            {error ? <p className="text-sm text-candle">{error}</p> : null}

            {isEditing && !canEdit ? (
              <p className="text-xs text-muted">Only the creator or an owner can edit or delete this event.</p>
            ) : (
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-full bg-lilac px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft disabled:opacity-50"
                >
                  {isSubmitting ? "Saving…" : isEditing ? "Save changes" : "Create event"}
                </button>

                {isEditing ? (
                  confirmingDelete ? (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted">Delete this event?</span>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="text-xs font-medium text-candle hover:underline disabled:opacity-50"
                      >
                        {isDeleting ? "Deleting…" : "Confirm"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingDelete(false)}
                        className="text-xs text-muted hover:text-parchment"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(true)}
                      className="text-xs text-candle hover:underline"
                    >
                      Delete
                    </button>
                  )
                ) : null}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
