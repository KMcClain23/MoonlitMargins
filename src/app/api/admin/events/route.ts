import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { sendPrivateEventInviteEmail } from "@/lib/resend";

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
  targetTiers: z.array(z.string()).optional(),
});

// Auth + section-level access ("events") are already enforced centrally by
// middleware.ts for every /api/admin/* route -- no session check here, same
// as applications/route.ts.
export async function GET() {
  const supabase = supabaseServer();
  const { data: events } = await supabase
    .from("events")
    .select(
      "id, title, description, event_type, starts_at, location, link_url, cover_image_url, registration_type, status, is_private, target_tiers, slug"
    )
    .order("starts_at", { ascending: true });

  return NextResponse.json({
    events: (events ?? []).map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      eventType: event.event_type,
      startsAt: event.starts_at,
      location: event.location,
      linkUrl: event.link_url,
      coverImageUrl: event.cover_image_url,
      registrationType: event.registration_type,
      status: event.status,
      isPrivate: event.is_private,
      targetTiers: event.target_tiers,
      slug: event.slug,
    })),
  });
}

export async function POST(request: NextRequest) {
  const parsed = eventSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const {
    title,
    description,
    eventType,
    startsAt,
    location,
    linkUrl,
    coverImageUrl,
    registrationType,
    status,
    isPrivate,
    targetTiers,
  } = parsed.data;
  const supabase = supabaseServer();
  const { data: created, error } = await supabase
    .from("events")
    .insert({
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
      target_tiers: targetTiers && targetTiers.length > 0 ? targetTiers : null,
    })
    .select("id, title, starts_at, location, description")
    .single();

  if (error || !created) {
    return NextResponse.json({ error: "Could not create event" }, { status: 500 });
  }

  if (isPrivate && targetTiers && targetTiers.length > 0) {
    try {
      const { data: recipients } = await supabase
        .from("members")
        .select("email")
        .in("tier", targetTiers)
        .not("email", "is", null);

      await Promise.allSettled(
        (recipients ?? [])
          .filter((r) => r.email)
          .map((r) =>
            sendPrivateEventInviteEmail({
              recipientEmail: r.email as string,
              eventTitle: created.title,
              startsAt: created.starts_at,
              location: created.location,
              description: created.description,
            })
          )
      );
    } catch {
      // Never let a notification failure affect the already-created event.
    }
  }

  revalidatePath("/events");
  return NextResponse.json({ success: true });
}
