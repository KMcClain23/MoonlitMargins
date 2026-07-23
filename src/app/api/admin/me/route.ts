import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/adminAuth";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Not every admin_user has a linked member profile (e.g. the developer
  // account) -- photoUrl is just null in that case, not an error.
  let photoUrl: string | null = null;
  if (session.memberId) {
    const supabase = supabaseServer();
    const { data: member } = await supabase
      .from("members")
      .select("photo_url")
      .eq("id", session.memberId)
      .maybeSingle();
    photoUrl = member?.photo_url ?? null;
  }

  return NextResponse.json({
    adminUserId: session.adminUserId,
    memberId: session.memberId,
    fullName: session.fullName,
    role: session.role,
    sections: session.sections,
    mustChangePassword: session.mustChangePassword,
    canAssignTasks: session.canAssignTasks,
    photoUrl,
  });
}
