import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { sendApplicationNotification } from "@/lib/resend";

const applicationSchema = z.object({
  kind: z.enum(["member", "interview", "collab"]),
  fullName: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email"),
  instagramHandle: z.string().optional(),
  tiktokHandle: z.string().optional(),
  answers: z.record(z.string(), z.string()),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = applicationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { kind, fullName, email, instagramHandle, tiktokHandle, answers } =
    parsed.data;

  const supabase = supabaseServer();

  const { error } = await supabase.from("applications").insert({
    kind,
    full_name: fullName,
    email,
    instagram_handle: instagramHandle || null,
    tiktok_handle: tiktokHandle || null,
    answers,
  });

  if (error) {
    return NextResponse.json(
      { error: "Something went wrong saving your application. Try again." },
      { status: 500 }
    );
  }

  try {
    await sendApplicationNotification({ kind, fullName, email });
  } catch {
    // The application is already saved — a failed email shouldn't
    // block the applicant. Leadership can still see it in Supabase.
  }

  return NextResponse.json({ success: true });
}
