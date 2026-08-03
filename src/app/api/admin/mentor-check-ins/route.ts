import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionFromRequest } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const showAll = request.nextUrl.searchParams.get("all") === "true";
  if (showAll && session.role !== "owner") {
    return NextResponse.json({ error: "Only the owner can view every mentor's check-ins" }, { status: 403 });
  }

  const supabase = supabaseServer();
  let query = supabase
    .from("mentor_check_ins")
    .select("id, member_id, mentor_admin_user_id, message, read_at, created_at")
    .order("created_at", { ascending: false });

  // A mentor only sees check-ins assigned to them -- ?all=true (owner-only,
  // checked above) is the one escape hatch, for oversight.
  if (!showAll) {
    query = query.eq("mentor_admin_user_id", session.adminUserId);
  }

  const { data: checkIns } = await query;

  const memberIds = Array.from(new Set((checkIns ?? []).map((c) => c.member_id as string)));
  const { data: members } =
    memberIds.length > 0
      ? await supabase.from("members").select("id, full_name").in("id", memberIds)
      : { data: [] };
  const memberNameById = new Map((members ?? []).map((m) => [m.id, m.full_name]));

  return NextResponse.json({
    checkIns: (checkIns ?? []).map((c) => ({
      id: c.id,
      memberId: c.member_id,
      memberName: memberNameById.get(c.member_id) ?? "Unknown",
      mentorAdminUserId: c.mentor_admin_user_id,
      message: c.message,
      readAt: c.read_at,
      createdAt: c.created_at,
    })),
  });
}
