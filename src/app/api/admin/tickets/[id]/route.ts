import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionFromRequest } from "@/lib/adminAuth";

const updateSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved"]),
});

function requireOwner(request: NextRequest) {
  const session = getSessionFromRequest(request);
  return session?.role === "owner" ? session : null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = requireOwner(request);
  if (!session) {
    return NextResponse.json({ error: "Only the owner can manage tickets" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { status } = parsed.data;
  const supabase = supabaseServer();

  // resolved_by/resolved_at only make sense while status is "resolved" --
  // moving a ticket back to open/in_progress (e.g. reopening it) clears
  // both rather than leaving a stale resolver attached to an active ticket.
  const update =
    status === "resolved"
      ? { status, resolved_by: session.adminUserId, resolved_at: new Date().toISOString() }
      : { status, resolved_by: null, resolved_at: null };

  const { error } = await supabase.from("support_tickets").update(update).eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Could not update that ticket" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
