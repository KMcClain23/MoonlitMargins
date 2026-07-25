import { NextRequest, NextResponse } from "next/server";
import { rrulestr } from "rrule";
import { supabaseServer } from "@/lib/supabase/server";
import { sendExpoPushToAdminUsers } from "@/lib/messaging";
import { sectionsForRole, type AdminRole } from "@/lib/adminSections";

// A separate cron route from planner-sync/route.ts, not folded into it --
// that one polls Google Calendar on a 10-minute schedule chosen for
// API-quota friendliness (see its own POLLING TRADEOFF comment); this one
// is about firing reminders close to their actual due time, so it runs
// every 5 minutes instead (see vercel.json). Keeping them separate means
// either schedule can be tuned independently, and a slow/failing Google
// Calendar poll can never delay a time-sensitive reminder.
//
// Same CRON_SECRET bearer-header auth as planner-sync/route.ts -- see that
// file's comment for why this can't use the normal admin-session gate.

// How far ahead recurring events are expanded to look for due occurrences.
// notification_lead_minutes is per-event and admin-editable, so in theory a
// lead time longer than this would never be caught in time -- an accepted
// simplicity tradeoff (leads are minutes-scale in every real use of this
// feature), not a hard product requirement.
const LOOKAHEAD_MS = 24 * 60 * 60 * 1000;

const EVENT_COLUMNS =
  "id, created_by, title, location, start_time, end_time, is_private, recurrence_rule, notification_lead_minutes";

type PlannerEventRow = {
  id: string;
  created_by: string;
  title: string;
  location: string | null;
  start_time: string;
  end_time: string;
  is_private: boolean;
  recurrence_rule: string | null;
  notification_lead_minutes: number;
};

function formatBody(occurrenceStart: Date, location: string | null): string {
  // No per-admin timezone stored anywhere in this app -- same
  // no-explicit-timeZone convention resend.ts's event-reminder emails
  // already use, not a new one introduced here.
  const when = occurrenceStart.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  return location ? `${when} · ${location}` : when;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const supabase = supabaseServer();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + LOOKAHEAD_MS);

  const [{ data: singleEvents }, { data: recurringEvents }, { data: adminUsers }] = await Promise.all([
    // Non-recurring events can be range-filtered directly in SQL, same as
    // the range GET route does.
    supabase
      .from("planner_events")
      .select(EVENT_COLUMNS)
      .is("recurrence_rule", null)
      .gt("start_time", now.toISOString())
      .lte("start_time", windowEnd.toISOString()),
    supabase.from("planner_events").select(EVENT_COLUMNS).not("recurrence_rule", "is", null),
    supabase.from("admin_users").select("id, role, allowed_sections"),
  ]);

  // Sections aren't a stored column -- computed from role + allowed_sections
  // the same way sessionFromAdminUserRow does at login (adminAuth.ts).
  // Everyone with that access (besides the creator, added per-occurrence
  // below) is eligible for a non-private event's reminder.
  const plannerAdminIds = (adminUsers ?? [])
    .filter((u) => sectionsForRole(u.role as AdminRole, u.allowed_sections as string[] | null).includes("planner"))
    .map((u) => u.id as string);

  const candidates: { row: PlannerEventRow; occurrenceStart: Date }[] = [];

  for (const row of (singleEvents ?? []) as PlannerEventRow[]) {
    candidates.push({ row, occurrenceStart: new Date(row.start_time) });
  }

  for (const row of (recurringEvents ?? []) as PlannerEventRow[]) {
    try {
      const rule = rrulestr(row.recurrence_rule!, { dtstart: new Date(row.start_time) });
      for (const occurrenceStart of rule.between(now, windowEnd)) {
        candidates.push({ row, occurrenceStart });
      }
    } catch {
      // A malformed recurrence_rule shouldn't take down the whole run --
      // same tolerance as the range GET route.
    }
  }

  // The DB queries above are a coarse window (a fixed lookahead), not the
  // exact per-event lead-time comparison -- that's applied here instead:
  // now() must have crossed (occurrenceStart - lead) but not reached
  // occurrenceStart itself yet.
  const due = candidates.filter(({ row, occurrenceStart }) => {
    const threshold = occurrenceStart.getTime() - row.notification_lead_minutes * 60_000;
    return now.getTime() >= threshold && now.getTime() < occurrenceStart.getTime();
  });

  if (due.length === 0) {
    return NextResponse.json({ success: true, sent: 0, checked: 0 });
  }

  // One batch lookup for every "already sent" row that could possibly
  // match one of this run's candidates, instead of a select per occurrence
  // -- same batch-lookup style as nameById in the range GET route.
  const { data: alreadySent } = await supabase
    .from("planner_event_notifications_sent")
    .select("planner_event_id, occurrence_start")
    .in("planner_event_id", Array.from(new Set(due.map((d) => d.row.id))));

  const sentKey = (eventId: string, occurrenceStartIso: string) => `${eventId}|${occurrenceStartIso}`;
  const sentSet = new Set(
    (alreadySent ?? []).map((r) => sentKey(r.planner_event_id as string, r.occurrence_start as string))
  );

  let sent = 0;

  for (const { row, occurrenceStart } of due) {
    const occurrenceStartIso = occurrenceStart.toISOString();
    if (sentSet.has(sentKey(row.id, occurrenceStartIso))) continue;

    const recipientIds = row.is_private
      ? [row.created_by]
      : Array.from(new Set([row.created_by, ...plannerAdminIds]));

    await sendExpoPushToAdminUsers(supabase, recipientIds, {
      title: `Upcoming: ${row.title}`,
      body: formatBody(occurrenceStart, row.location),
      data: { plannerEventId: row.id },
    });

    // Recorded regardless of whether any device actually had a token to
    // deliver to -- sendExpoPushToAdminUsers is itself best-effort and
    // never throws (see its own doc comment), and without this an event
    // with zero registered devices would get re-attempted every 5 minutes
    // forever.
    const { error } = await supabase.from("planner_event_notifications_sent").insert({
      planner_event_id: row.id,
      occurrence_start: occurrenceStartIso,
    });
    if (!error) sent += 1;
  }

  return NextResponse.json({ success: true, sent, checked: due.length });
}
