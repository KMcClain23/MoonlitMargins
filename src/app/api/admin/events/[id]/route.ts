import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const eventSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  eventType: z.enum(["reading_sprint", "tiktok_live", "author_event", "annual_meetup", "game_night", "other"]),
  startsAt: z.string(),
  location: z.string().optional(),
  linkUrl: z.string().optional(),
  coverImageUrl: z.string().optional(),
  registrationType: z.enum(["rsvp", "ticketing"]).optional(),
  status: z.enum(["scheduled", "canceled"]).optional(),
  isPrivate: z.boolean().optional(),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = supabaseServer();
  const { error } = await supabase.from("events").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Could not delete event" }, { status: 500 });
  }

  revalidatePath("/events");
  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = eventSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { title, description, eventType, startsAt, location, linkUrl, coverImageUrl, registrationType, status, isPrivate } =
    parsed.data;
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("events")
    .update({
      title,
      description: description || null,
      event_type: eventType,
      starts_at: new Date(startsAt).toISOString(),
      location: location || null,
      link_url: linkUrl || null,
      cover_image_url: coverImageUrl || null,
      registration_type: registrationType ?? "rsvp",
      status: status ?? "scheduled",
      is_private: isPrivate ?? false,
    })
    .eq("id", id)
    .select("slug")
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not update event" }, { status: 500 });
  }

  revalidatePath("/events");
  if (data?.slug) revalidatePath(`/events/${data.slug}`);
  return NextResponse.json({ success: true });
}
