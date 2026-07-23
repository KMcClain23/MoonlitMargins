import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionFromRequest } from "@/lib/adminAuth";

const registerSchema = z.object({
  expoPushToken: z.string().min(1),
  deviceId: z.string().min(1),
  platform: z.string().min(1),
  preferredChannelId: z.string().min(1).optional(),
});

const unregisterSchema = z.object({
  deviceId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = registerSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { expoPushToken, deviceId, platform, preferredChannelId } = parsed.data;
  const supabase = supabaseServer();

  const { error } = await supabase.from("admin_push_tokens").upsert(
    {
      admin_user_id: session.adminUserId,
      device_id: deviceId,
      expo_push_token: expoPushToken,
      platform,
      preferred_channel_id: preferredChannelId ?? "messages-default",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "admin_user_id,device_id" }
  );

  if (error) {
    return NextResponse.json({ error: "Could not register this device for push notifications" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// Called on mobile logout, so a signed-out device stops receiving pushes
// meant for whoever's now signed in on it next.
export async function DELETE(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = unregisterSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { error } = await supabase
    .from("admin_push_tokens")
    .delete()
    .eq("admin_user_id", session.adminUserId)
    .eq("device_id", parsed.data.deviceId);

  if (error) {
    return NextResponse.json({ error: "Could not remove this device" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
