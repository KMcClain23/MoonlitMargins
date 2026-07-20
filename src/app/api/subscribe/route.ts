import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { sendNewsletterSignupNotification } from "@/lib/resend";

const subscribeSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = subscribeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const supabase = supabaseServer();

  const { error } = await supabase
    .from("subscribers")
    .insert({ email: parsed.data.email });

  // Unique violation just means they're already on the list — treat as success.
  if (error && error.code !== "23505") {
    return NextResponse.json(
      { error: "Something went wrong signing you up. Try again." },
      { status: 500 }
    );
  }

  try {
    await sendNewsletterSignupNotification(parsed.data.email);
  } catch {
    // Never block a signup on a failed notification email.
  }

  return NextResponse.json({ success: true });
}
