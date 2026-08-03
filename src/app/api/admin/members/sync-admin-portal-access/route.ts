import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionFromRequest } from "@/lib/adminAuth";

// Same owner-only precedent as the other bulk actions on this page
// (bulk-provision, bulk-portal-invite) -- this touches every linked
// member's row in one pass.
function requireOwner(request: NextRequest) {
  const session = getSessionFromRequest(request);
  return session?.role === "owner" ? session : null;
}

export async function POST(request: NextRequest) {
  if (!requireOwner(request)) {
    return NextResponse.json(
      { error: "Only the owner can sync admin credentials to member portal access" },
      { status: 403 }
    );
  }

  const supabase = supabaseServer();

  const { data: adminUsers } = await supabase
    .from("admin_users")
    .select("id, full_name, email, password_hash, member_id")
    .not("member_id", "is", null);

  const memberIds = (adminUsers ?? []).map((u) => u.member_id as string);
  const { data: members } =
    memberIds.length > 0
      ? await supabase.from("members").select("id, email, password_hash").in("id", memberIds)
      : { data: [] };
  const memberById = new Map((members ?? []).map((m) => [m.id, m]));

  const granted: { fullName: string; loginEmail: string; emailMatchesAdmin: boolean }[] = [];
  const skipped: { fullName: string; reason: string }[] = [];

  for (const adminUser of adminUsers ?? []) {
    const member = memberById.get(adminUser.member_id as string);
    if (!member) {
      skipped.push({ fullName: adminUser.full_name as string, reason: "Linked member record not found" });
      continue;
    }

    // Copying onto an already-set portal password would silently change
    // what someone typed in themselves during /portal/setup -- this is
    // only for members who don't have portal access at all yet.
    if (member.password_hash) {
      skipped.push({ fullName: adminUser.full_name as string, reason: "Already has portal access" });
      continue;
    }

    // Portal login looks the member up by members.email specifically, so
    // that has to actually be set for this to be usable. Only filled in
    // when missing -- never overwrites an existing (possibly different)
    // member email.
    const update: Record<string, unknown> = { password_hash: adminUser.password_hash };
    if (!member.email) {
      update.email = (adminUser.email as string).toLowerCase().trim();
    }
    const loginEmail = (member.email as string | null) ?? (adminUser.email as string);

    const { error } = await supabase.from("members").update(update).eq("id", member.id);
    if (error) {
      skipped.push({ fullName: adminUser.full_name as string, reason: "Could not update member record" });
      continue;
    }

    granted.push({
      fullName: adminUser.full_name as string,
      loginEmail,
      emailMatchesAdmin: loginEmail.toLowerCase().trim() === (adminUser.email as string).toLowerCase().trim(),
    });
  }

  return NextResponse.json({ granted, skipped });
}
