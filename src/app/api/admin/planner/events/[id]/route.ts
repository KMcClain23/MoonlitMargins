import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionFromRequest } from "@/lib/adminAuth";
import { deleteGoogleCalendarEvent, updateGoogleCalendarEvent } from "@/lib/googleCalendar";

// Section-level access (session.sections.includes("planner")) is enforced
// by middleware.ts, same as GET/POST /api/admin/planner/events -- what's
// checked here on top of that is the creator-or-owner rule, which
// middleware has no way to know (it needs this specific row's created_by).

const updateSchema = z.object({
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

// GET wasn't part of the original Phase 1 scope (only the range-based
// list GET existed), but the web edit form needs it: a recurring
// event's occurrence pills carry that OCCURRENCE's own shifted start/end
// time, not the series' true stored start_time/end_time (its DTSTART
// anchor). Pre-filling the edit form from an arbitrary clicked
// occurrence instead of this would silently move the whole series'
// anchor to wherever that occurrence happened to fall.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = supabaseServer();

  const { data: row, error } = await supabase
    .from("planner_events")
    .select(
      "id, created_by, title, description, location, start_time, end_time, all_day, is_private, recurrence_rule, notification_lead_minutes, synced_from_google"
    )
    .eq("id", id)
    .maybeSingle();

  // A genuine query failure (e.g. a missing column) was previously
  // indistinguishable from "no such row" -- both left `row` unset and
  // returned the same 404, which reads as "this event doesn't exist"
  // when the real problem is the query itself couldn't run. See the list
  // GET route's matching comment for the concrete case this caught.
  if (error) {
    console.error("[planner] Failed to fetch planner event:", error);
    return NextResponse.json({ error: "Could not load that event" }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  // Same visibility rule as the list GET -- a private event is only
  // visible to whoever created it.
  if (row.is_private && row.created_by !== session.adminUserId) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    startTime: row.start_time,
    endTime: row.end_time,
    allDay: row.all_day,
    isPrivate: row.is_private,
    createdBy: row.created_by,
    recurrenceRule: row.recurrence_rule,
    notificationLeadMinutes: row.notification_lead_minutes,
    syncedFromGoogle: row.synced_from_google,
  });
}

async function requireCreatorOrOwner(
  supabase: ReturnType<typeof supabaseServer>,
  id: string,
  session: { adminUserId: string; role: string }
) {
  const { data: existing } = await supabase
    .from("planner_events")
    .select("created_by, google_event_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) {
    return { error: NextResponse.json({ error: "Event not found" }, { status: 404 }), googleEventId: null };
  }
  if (existing.created_by !== session.adminUserId && session.role !== "owner") {
    return {
      error: NextResponse.json({ error: "Only the creator or an owner can do that" }, { status: 403 }),
      googleEventId: null,
    };
  }
  return { error: null, googleEventId: existing.google_event_id as string | null };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = supabaseServer();

  const { error: permissionError, googleEventId } = await requireCreatorOrOwner(supabase, id, session);
  if (permissionError) return permissionError;

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { title, description, location, startTime, endTime, allDay, isPrivate, recurrenceRule, notificationLeadMinutes } =
    parsed.data;

  // IMPORTANT: this edits the WHOLE recurring series -- start_time/
  // end_time/recurrence_rule define every occurrence, and there's no
  // per-occurrence exception-date concept in this version. Editing a
  // single occurrence of a recurring event (e.g. "just move this one
  // week's meeting") is intentionally out of scope and does NOT work
  // here; any change shifts the entire series.
  const { error } = await supabase
    .from("planner_events")
    .update({
      title,
      description: description || null,
      location: location || null,
      start_time: startTime,
      end_time: endTime,
      all_day: allDay ?? false,
      is_private: isPrivate ?? false,
      recurrence_rule: recurrenceRule || null,
      notification_lead_minutes: notificationLeadMinutes ?? 30,
      // No update trigger on this table -- updated_at only defaults on
      // insert, so it's set explicitly here to actually track edits.
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Could not update event" }, { status: 500 });
  }

  // Best-effort, same "never block the local operation" rule as
  // POST's create sync -- the row is already updated and this response
  // is already a success either way. Nothing to push if this event was
  // never linked to Google in the first place (googleEventId null --
  // e.g. the original create sync failed or Calendar wasn't configured
  // yet at the time).
  if (googleEventId) {
    try {
      await updateGoogleCalendarEvent(googleEventId, {
        title,
        description: description || null,
        location: location || null,
        startTime,
        endTime,
        allDay: allDay ?? false,
        recurrenceRule: recurrenceRule || null,
      });
    } catch (err) {
      console.error("[planner] Google Calendar update sync threw:", err);
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = supabaseServer();

  const { error: permissionError, googleEventId } = await requireCreatorOrOwner(supabase, id, session);
  if (permissionError) return permissionError;

  // Deletes the whole series. planner_event_notifications_sent rows for
  // this event are removed automatically via its
  // "on delete cascade" foreign key -- no separate cleanup needed here.
  const { error } = await supabase.from("planner_events").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Could not delete event" }, { status: 500 });
  }

  // Best-effort, same "never block the local operation" rule as
  // everywhere else this syncs -- the row is already gone locally and
  // this response is already a success either way. Captured
  // googleEventId above, before the delete, since it can't be looked up
  // from the row anymore afterward.
  if (googleEventId) {
    try {
      await deleteGoogleCalendarEvent(googleEventId);
    } catch (err) {
      console.error("[planner] Google Calendar delete sync threw:", err);
    }
  }

  return NextResponse.json({ success: true });
}
