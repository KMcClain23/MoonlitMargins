import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  getSyncState,
  listGoogleCalendarChanges,
  setSyncState,
  type GoogleCalendarEventItem,
} from "@/lib/googleCalendar";

// Deliberately outside /api/admin -- Vercel Cron has no admin session to
// send, so middleware.ts's normal auth gate doesn't (and can't) apply
// here. Protected instead by a shared-secret bearer header, which is
// Vercel's own documented pattern: when a CRON_SECRET env var is
// configured on the project, Vercel automatically sends
// "Authorization: Bearer <CRON_SECRET>" on every scheduled invocation
// of a cron path (see vercel.json).
//
// POLLING TRADEOFF: this runs on a schedule (every 10 minutes, see
// vercel.json), not via a Google push-notification webhook. A change
// made directly in Google Calendar can take up to ~10 minutes to appear
// here -- this is a deliberate simplicity tradeoff, not a bug. Changes
// made in the app itself push to Google immediately (see the create/
// PATCH/DELETE routes' best-effort Google Calendar calls), so only the
// Google-Calendar-to-app direction has this delay.

const SYNC_TOKEN_KEY = "planner_calendar_sync_token";

function extractDateTime(value: { date?: string; dateTime?: string } | undefined): { iso: string; allDay: boolean } | null {
  if (!value) return null;
  if (value.dateTime) return { iso: value.dateTime, allDay: false };
  if (value.date) return { iso: `${value.date}T00:00:00.000Z`, allDay: true };
  return null;
}

function extractRecurrenceRule(recurrence: string[] | undefined): string | null {
  if (!recurrence) return null;
  const rruleLine = recurrence.find((line) => line.startsWith("RRULE:"));
  return rruleLine ? rruleLine.slice("RRULE:".length) : null;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const supabase = supabaseServer();

  const storedSyncToken = await getSyncState(SYNC_TOKEN_KEY);
  const changes = await listGoogleCalendarChanges(storedSyncToken);
  if (!changes) {
    return NextResponse.json({ error: "Could not fetch changes from Google Calendar" }, { status: 502 });
  }

  // No natural admin_user_id for an event created directly in Google
  // Calendar -- whichever admin_user currently has role "owner" is the
  // designated fallback. Looked up once per run, not once per event.
  const { data: ownerRow } = await supabase
    .from("admin_users")
    .select("id")
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();
  const fallbackOwnerId: string | null = ownerRow?.id ?? null;

  let created = 0;
  let updated = 0;
  let deleted = 0;
  let skipped = 0;

  for (const item of changes.events as GoogleCalendarEventItem[]) {
    if (item.status === "cancelled") {
      const { error, count } = await supabase
        .from("planner_events")
        .delete({ count: "exact" })
        .eq("google_event_id", item.id);
      if (!error && count) deleted += count;
      continue;
    }

    // An exception instance of a recurring event (one occurrence edited
    // individually in Google Calendar) has no representation in this
    // schema -- planner_events models a whole series as a single row.
    // Rather than create a confusing duplicate or corrupt the master
    // row, this is skipped; the master series itself still syncs
    // normally via its own item.
    if (item.recurringEventId) {
      console.warn(`[planner-sync] Skipping recurring-event exception instance ${item.id} -- not representable locally`);
      skipped += 1;
      continue;
    }

    const start = extractDateTime(item.start);
    const end = extractDateTime(item.end);
    if (!start || !end || !item.summary) {
      skipped += 1;
      continue;
    }

    const recurrenceRule = extractRecurrenceRule(item.recurrence);

    const { data: existing } = await supabase
      .from("planner_events")
      .select("id")
      .eq("google_event_id", item.id)
      .maybeSingle();

    if (existing) {
      // Direct DB write, not a call back into the Phase 1 PATCH route --
      // that route pushes changes TO Google, which would immediately
      // re-trigger a push back for a change that just came FROM Google,
      // looping the two directions into each other.
      const { error } = await supabase
        .from("planner_events")
        .update({
          title: item.summary,
          description: item.description ?? null,
          location: item.location ?? null,
          start_time: start.iso,
          end_time: end.iso,
          all_day: start.allDay,
          recurrence_rule: recurrenceRule,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (!error) updated += 1;
    } else if (fallbackOwnerId) {
      const { error } = await supabase.from("planner_events").insert({
        created_by: fallbackOwnerId,
        title: item.summary,
        description: item.description ?? null,
        location: item.location ?? null,
        start_time: start.iso,
        end_time: end.iso,
        all_day: start.allDay,
        is_private: false,
        recurrence_rule: recurrenceRule,
        notification_lead_minutes: 30,
        google_event_id: item.id,
        synced_from_google: true,
      });
      if (!error) created += 1;
    } else {
      console.error("[planner-sync] No owner admin_user found -- cannot create a local row for", item.id);
      skipped += 1;
    }
  }

  // Only a non-null token is worth persisting -- an absent one here
  // would just mean the next run falls back to a full resync again,
  // which is safe (if wasteful) rather than actually wrong.
  if (changes.nextSyncToken) {
    await setSyncState(SYNC_TOKEN_KEY, changes.nextSyncToken);
  }

  return NextResponse.json({ success: true, created, updated, deleted, skipped });
}
