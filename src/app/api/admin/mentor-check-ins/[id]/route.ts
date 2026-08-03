import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionFromRequest } from "@/lib/adminAuth";

const updateSchema = z.object({
  read: z.literal(true),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { data: checkIn } = await supabase
    .from("mentor_check_ins")
    .select("mentor_admin_user_id")
    .eq("id", id)
    .maybeSingle();

  if (!checkIn) {
    return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
  }

  if (checkIn.mentor_admin_user_id !== session.adminUserId && session.role !== "owner") {
    return NextResponse.json({ error: "Only the assigned mentor or the owner can do that" }, { status: 403 });
  }

  const { error } = await supabase
    .from("mentor_check_ins")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Could not update that check-in" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
