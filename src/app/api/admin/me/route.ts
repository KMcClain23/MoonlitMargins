import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/adminAuth";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = supabaseServer();

  // Not every admin_user has a linked member profile (e.g. the developer
  // account) -- photo fields are just null/default in that case, not an
  // error. zoom/offset default to 1/0 (an un-cropped, centered photo) so
  // a first-time photo -- one with no saved crop yet -- doesn't come back
  // as null and force the caller to invent its own fallback.
  let photoUrl: string | null = null;
  let photoZoom = 1;
  let photoOffsetX = 0;
  let photoOffsetY = 0;
  if (session.memberId) {
    const { data: member } = await supabase
      .from("members")
      .select("photo_url, photo_zoom, photo_offset_x, photo_offset_y")
      .eq("id", session.memberId)
      .maybeSingle();
    photoUrl = member?.photo_url ?? null;
    photoZoom = member?.photo_zoom ?? 1;
    photoOffsetX = member?.photo_offset_x ?? 0;
    photoOffsetY = member?.photo_offset_y ?? 0;
  }

  // linked_google_email isn't part of the signed session payload (like
  // photoUrl, it's a profile detail rather than something auth/section
  // checks need on every request), so it's read fresh here too.
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("linked_google_email")
    .eq("id", session.adminUserId)
    .maybeSingle();

  return NextResponse.json({
    adminUserId: session.adminUserId,
    memberId: session.memberId,
    fullName: session.fullName,
    role: session.role,
    sections: session.sections,
    mustChangePassword: session.mustChangePassword,
    canAssignTasks: session.canAssignTasks,
    photoUrl,
    photoZoom,
    photoOffsetX,
    photoOffsetY,
    linkedGoogleEmail: adminUser?.linked_google_email ?? null,
  });
}
