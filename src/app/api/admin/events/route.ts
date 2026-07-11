import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const eventSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  eventType: z.enum(["reading_sprint", "tiktok_live", "author_event", "annual_meetup", "other"]),
  startsAt: z.string(),
  location: z.string().optional(),
  linkUrl: z.string().optional(),
  coverImageUrl: z.string().optional(),
  registrationType: z.enum(["rsvp", "ticketing"]).optional(),
  status: z.enum(["scheduled", "canceled"]).optional(),
});

export async function POST(request: NextRequest) {
  const parsed = eventSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { title, description, eventType, startsAt, location, linkUrl, coverImageUrl, registrationType, status } =
    parsed.data;
  const supabase = supabaseServer();
  const { error } = await supabase.from("events").insert({
    title,
    description: description || null,
    event_type: eventType,
    starts_at: new Date(startsAt).toISOString(),
    location: location || null,
    link_url: linkUrl || null,
    cover_image_url: coverImageUrl || null,
    registration_type: registrationType ?? "rsvp",
    status: status ?? "scheduled",
  });

  if (error) {
    return NextResponse.json({ error: "Could not create event" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
