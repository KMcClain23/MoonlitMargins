import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { issuePortalInvite } from "@/lib/portalInvite";

// No extra role check here -- same precedent as PATCH/DELETE
// /api/admin/members/[id] (no per-route gate beyond middleware's "members"
// section check, which every admin with roster access already passes).
// Works for both a first-time invite and a resend -- either way this
// simply issues a fresh token, overwriting whatever was there before.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = supabaseServer();

  const { data: member } = await supabase
    .from("members")
    .select("id, full_name, email")
    .eq("id", id)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const result = await issuePortalInvite(supabase, member);
  if (!result) {
    return NextResponse.json({ error: "Could not generate a portal invite" }, { status: 500 });
  }

  return NextResponse.json({ setupUrl: result.setupUrl });
}
