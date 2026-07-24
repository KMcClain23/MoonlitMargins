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
  // account) -- photoUrl is just null in that case, not an error.
  let photoUrl: string | null = null;
  if (session.memberId) {
    const { data: member } = await supabase
      .from("members")
      .select("photo_url")
      .eq("id", session.memberId)
      .maybeSingle();
    photoUrl = member?.photo_url ?? null;
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
    linkedGoogleEmail: adminUser?.linked_google_email ?? null,
  });
}
