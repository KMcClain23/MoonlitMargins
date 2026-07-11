import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { sendRsvpNotification } from "@/lib/resend";

const rsvpSchema = z.object({
  firstName: z.string().min(1, "Enter your first name"),
  lastName: z.string().min(1, "Enter your last name"),
  email: z.string().email("Enter a valid email"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = rsvpSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { firstName, lastName, email } = parsed.data;
  const supabase = supabaseServer();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, starts_at, status")
    .eq("id", id)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "That event couldn't be found." }, { status: 404 });
  }

  if (event.status === "canceled") {
    return NextResponse.json({ error: "This event has been canceled." }, { status: 400 });
  }

  const { error } = await supabase.from("event_rsvps").insert({
    event_id: id,
    first_name: firstName,
    last_name: lastName,
    email,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "You've already RSVP'd with this email." }, { status: 409 });
    }
    return NextResponse.json({ error: "Something went wrong saving your RSVP. Try again." }, { status: 500 });
  }

  try {
    await sendRsvpNotification({
      eventTitle: event.title,
      firstName,
      lastName,
      email,
      startsAt: event.starts_at,
    });
  } catch {
    // The RSVP is already saved -- a failed email shouldn't block the guest.
  }

  return NextResponse.json({ success: true });
}
