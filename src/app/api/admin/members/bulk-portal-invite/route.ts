import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionFromRequest } from "@/lib/adminAuth";
import { issuePortalInvite } from "@/lib/portalInvite";

// Same precedent as bulk-provisioning admin_users accounts -- a mass
// action touching every member on the roster is owner-only, unlike the
// single-member send/resend route right next to this one.
function requireOwner(request: NextRequest) {
  const session = getSessionFromRequest(request);
  return session?.role === "owner" ? session : null;
}

export async function POST(request: NextRequest) {
  if (!requireOwner(request)) {
    return NextResponse.json({ error: "Only the owner can bulk-invite the roster" }, { status: 403 });
  }

  const supabase = supabaseServer();
  const { data: members } = await supabase
    .from("members")
    .select("id, full_name, email, password_hash")
    .order("full_name", { ascending: true });

  // Anyone who's already set a password already has portal access -- this
  // is for everyone who doesn't yet, not a mass password-reset tool (that
  // stays the single-member resend route's job).
  const eligible = (members ?? []).filter((m) => !m.password_hash);

  const invited: { id: string; fullName: string; email: string | null; setupUrl: string }[] = [];
  const failed: { id: string; fullName: string }[] = [];

  for (const member of eligible) {
    const result = await issuePortalInvite(supabase, member);
    if (result) {
      invited.push({ id: member.id, fullName: member.full_name, email: member.email, setupUrl: result.setupUrl });
    } else {
      failed.push({ id: member.id, fullName: member.full_name });
    }
  }

  return NextResponse.json({
    invited,
    failed,
    skipped: (members ?? []).length - eligible.length,
  });
}
