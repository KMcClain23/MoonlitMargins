import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionFromRequest } from "@/lib/adminAuth";

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

async function requireCreatorOrOwner(
  supabase: ReturnType<typeof supabaseServer>,
  id: string,
  session: { adminUserId: string; role: string }
) {
  const { data: existing } = await supabase.from("planner_events").select("created_by").eq("id", id).maybeSingle();
  if (!existing) {
    return { error: NextResponse.json({ error: "Event not found" }, { status: 404 }) };
  }
  if (existing.created_by !== session.adminUserId && session.role !== "owner") {
    return { error: NextResponse.json({ error: "Only the creator or an owner can do that" }, { status: 403 }) };
  }
  return { error: null };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = supabaseServer();

  const { error: permissionError } = await requireCreatorOrOwner(supabase, id, session);
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

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = supabaseServer();

  const { error: permissionError } = await requireCreatorOrOwner(supabase, id, session);
  if (permissionError) return permissionError;

  // Deletes the whole series. planner_event_notifications_sent rows for
  // this event are removed automatically via its
  // "on delete cascade" foreign key -- no separate cleanup needed here.
  const { error } = await supabase.from("planner_events").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Could not delete event" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
