import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rrulestr } from "rrule";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionFromRequest } from "@/lib/adminAuth";
import { createGoogleCalendarEvent } from "@/lib/googleCalendar";

// Section-level access (session.sections.includes("planner"), 403
// otherwise) is enforced by middleware.ts, the same way it already is for
// members/events/tasks/etc -- these routes don't re-check it themselves,
// matching that established convention.

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
  allDay: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  recurrenceRule: z.string().optional(),
  notificationLeadMinutes: z.number().int().min(0).optional(),
});

const EVENT_COLUMNS =
  "id, created_by, title, description, location, start_time, end_time, all_day, is_private, recurrence_rule, notification_lead_minutes, synced_from_google";

type PlannerEventRow = {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  is_private: boolean;
  recurrence_rule: string | null;
  notification_lead_minutes: number;
  synced_from_google: boolean;
};

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const startParam = request.nextUrl.searchParams.get("start");
  const endParam = request.nextUrl.searchParams.get("end");
  if (!startParam || !endParam) {
    return NextResponse.json({ error: "start and end query params are required" }, { status: 400 });
  }

  const rangeStart = new Date(startParam);
  const rangeEnd = new Date(endParam);
  if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
    return NextResponse.json({ error: "start and end must be valid ISO dates" }, { status: 400 });
  }

  const supabase = supabaseServer();

  // Non-recurring events can be range-filtered directly in SQL. Recurring
  // ones can't -- their occurrences aren't stored as rows -- so those are
  // fetched in full here and expanded via rrule below instead.
  const [singleResult, recurringResult, adminUsersResult] = await Promise.all([
    supabase
      .from("planner_events")
      .select(EVENT_COLUMNS)
      .is("recurrence_rule", null)
      .gte("start_time", rangeStart.toISOString())
      .lte("start_time", rangeEnd.toISOString()),
    supabase.from("planner_events").select(EVENT_COLUMNS).not("recurrence_rule", "is", null),
    supabase.from("admin_users").select("id, full_name"),
  ]);

  // A failed query here (e.g. a schema mismatch -- a column EVENT_COLUMNS
  // references that a pending migration hasn't actually added to this
  // database yet) previously fell through silently: `data` comes back
  // null, `?? []` turned that into "zero events," and the route still
  // returned 200. Every event vanished from every view with no error
  // anywhere -- exactly indistinguishable from "there are just no events
  // in range." Surfacing the error here instead means a schema drift like
  // that fails loudly (500, logged, and shown in the UI via PlannerBoard's
  // existing !res.ok handling) instead of silently.
  const { data: singleEvents, error: singleError } = singleResult;
  const { data: recurringEvents, error: recurringError } = recurringResult;
  if (singleError || recurringError) {
    console.error("[planner] Failed to fetch planner events:", singleError ?? recurringError);
    return NextResponse.json({ error: "Could not load planner events" }, { status: 500 });
  }

  // Names are a display nicety (falls back to "Unknown" below) -- not
  // worth failing the whole request over, so this one's errors are just
  // logged rather than turned into a 500 like the two above.
  if (adminUsersResult.error) {
    console.error("[planner] Failed to fetch admin_users for name lookup:", adminUsersResult.error);
  }
  const nameById = new Map((adminUsersResult.data ?? []).map((u) => [u.id, u.full_name]));
  // Captured as a plain string so the nested functions below don't lose
  // TypeScript's null-narrowing on `session` (control-flow narrowing
  // doesn't cross function boundaries for closed-over variables).
  const currentAdminUserId = session.adminUserId;

  function toOccurrence(row: PlannerEventRow, occurrenceStart: Date, occurrenceEnd: Date) {
    return {
      id: row.id,
      occurrenceStart: occurrenceStart.toISOString(),
      occurrenceEnd: occurrenceEnd.toISOString(),
      title: row.title,
      description: row.description,
      location: row.location,
      allDay: row.all_day,
      isPrivate: row.is_private,
      createdBy: row.created_by,
      createdByName: nameById.get(row.created_by) ?? "Unknown",
      recurrenceRule: row.recurrence_rule,
      notificationLeadMinutes: row.notification_lead_minutes,
      syncedFromGoogle: row.synced_from_google,
    };
  }

  // Private events are only visible to whoever created them -- everyone
  // else with planner access sees only the non-private ones.
  function isVisible(row: PlannerEventRow) {
    return !row.is_private || row.created_by === currentAdminUserId;
  }

  const results: ReturnType<typeof toOccurrence>[] = [];

  for (const row of (singleEvents ?? []) as PlannerEventRow[]) {
    if (!isVisible(row)) continue;
    results.push(toOccurrence(row, new Date(row.start_time), new Date(row.end_time)));
  }

  for (const row of (recurringEvents ?? []) as PlannerEventRow[]) {
    if (!isVisible(row)) continue;
    const durationMs = new Date(row.end_time).getTime() - new Date(row.start_time).getTime();
    try {
      const rule = rrulestr(row.recurrence_rule!, { dtstart: new Date(row.start_time) });
      const occurrenceStarts = rule.between(rangeStart, rangeEnd);
      for (const occurrenceStart of occurrenceStarts) {
        results.push(toOccurrence(row, occurrenceStart, new Date(occurrenceStart.getTime() + durationMs)));
      }
    } catch {
      // A malformed recurrence_rule shouldn't take down the whole
      // response -- just skip that event's occurrences.
    }
  }

  // ISO 8601 timestamps sort correctly as plain strings.
  results.sort((a, b) => a.occurrenceStart.localeCompare(b.occurrenceStart));

  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { title, description, location, startTime, endTime, allDay, isPrivate, recurrenceRule, notificationLeadMinutes } =
    parsed.data;
  const supabase = supabaseServer();

  const { data: created, error } = await supabase
    .from("planner_events")
    .insert({
      created_by: session.adminUserId,
      title,
      description: description || null,
      location: location || null,
      start_time: startTime,
      end_time: endTime,
      all_day: allDay ?? false,
      is_private: isPrivate ?? false,
      recurrence_rule: recurrenceRule || null,
      notification_lead_minutes: notificationLeadMinutes ?? 30,
      // google_event_id starts null -- set below once/if the Google
      // Calendar create call below actually succeeds.
    })
    .select("id")
    .single();

  if (error || !created) {
    return NextResponse.json({ error: "Could not create event" }, { status: 500 });
  }

  // Best-effort, same "never block the local operation" rule as every
  // other push-notification-style side effect in this app -- the event
  // is already saved and this response is already a success either way.
  try {
    const googleEventId = await createGoogleCalendarEvent({
      title,
      description: description || null,
      location: location || null,
      startTime,
      endTime,
      allDay: allDay ?? false,
      recurrenceRule: recurrenceRule || null,
    });
    if (googleEventId) {
      await supabase.from("planner_events").update({ google_event_id: googleEventId }).eq("id", created.id);
    }
  } catch (err) {
    console.error("[planner] Google Calendar create sync threw:", err);
  }

  return NextResponse.json({ success: true, id: created.id });
}
