import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionFromRequest } from "@/lib/adminAuth";

// Mentor assignment now lives exclusively on /admin/orientation (owner-only
// page) -- owner-gated here too, same precedent as the other owner-only
// admin actions (tickets, bulk-portal-invite, sync-admin-portal-access),
// rather than relying only on the page hiding the control.
function requireOwner(request: NextRequest) {
  const session = getSessionFromRequest(request);
  return session?.role === "owner" ? session : null;
}

const updateSchema = z.object({
  mentorAdminUserId: z.string().uuid().nullable(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireOwner(request)) {
    return NextResponse.json({ error: "Only the owner can assign mentors" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { error } = await supabase
    .from("members")
    .update({ mentor_admin_user_id: parsed.data.mentorAdminUserId })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Could not update mentor assignment" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
