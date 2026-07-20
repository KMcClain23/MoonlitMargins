import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { supabaseServer } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/password";
import { SESSION_COOKIE, parseSessionToken } from "@/lib/adminAuth";

function requireOwner(request: NextRequest) {
  const session = parseSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  return session?.role === "owner" ? session : null;
}

function generateTempPassword(): string {
  return "Moonlit-" + randomBytes(4).toString("hex");
}

/**
 * Leadership tiers (founder/council/junior_council) get role "admin" --
 * full access except managing other users, matching "start with access to
 * everything, I'll manually adjust." Regular members get role "editor"
 * restricted to just the Tasks section (Messages is universal for every
 * logged-in account regardless of role, so it doesn't need to be listed),
 * with task-assignment permission turned off -- they can view and respond
 * to their own tasks but not create or reassign.
 */
function provisioningPlanForTier(tier: string): { role: "admin" | "editor"; allowedSections: string[] | null; canAssignTasks: boolean } {
  if (tier === "member") {
    return { role: "editor", allowedSections: ["tasks"], canAssignTasks: false };
  }
  return { role: "admin", allowedSections: null, canAssignTasks: true };
}

export async function POST(request: NextRequest) {
  if (!requireOwner(request)) {
    return NextResponse.json({ error: "Only the owner can bulk-provision access" }, { status: 403 });
  }

  const supabase = supabaseServer();

  const { data: members } = await supabase
    .from("members")
    .select("id, full_name, email, tier")
    .not("email", "is", null);

  const { data: existingAccounts } = await supabase.from("admin_users").select("member_id");
  const alreadyProvisioned = new Set((existingAccounts ?? []).map((a) => a.member_id).filter(Boolean));

  const candidates = (members ?? []).filter((m) => m.email && !alreadyProvisioned.has(m.id));

  if (candidates.length === 0) {
    return NextResponse.json({ created: [], skipped: (members ?? []).length });
  }

  const created: { fullName: string; email: string; tempPassword: string; role: string }[] = [];
  const failed: { fullName: string; email: string; error: string }[] = [];

  for (const member of candidates) {
    const plan = provisioningPlanForTier(member.tier ?? "member");
    const tempPassword = generateTempPassword();

    const { error } = await supabase.from("admin_users").insert({
      full_name: member.full_name,
      email: (member.email as string).toLowerCase().trim(),
      password_hash: hashPassword(tempPassword),
      role: plan.role,
      allowed_sections: plan.allowedSections,
      can_assign_tasks: plan.canAssignTasks,
      member_id: member.id,
      must_change_password: true,
    });

    if (error) {
      failed.push({ fullName: member.full_name, email: member.email as string, error: "Could not create account" });
      continue;
    }

    created.push({
      fullName: member.full_name,
      email: member.email as string,
      tempPassword,
      role: plan.role,
    });
  }

  return NextResponse.json({
    created,
    failed,
    skipped: (members ?? []).length - candidates.length,
  });
}
