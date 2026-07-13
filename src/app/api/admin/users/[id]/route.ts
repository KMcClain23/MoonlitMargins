import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/password";
import { SESSION_COOKIE, parseSessionToken } from "@/lib/adminAuth";
import { ALL_SECTIONS, sectionsForRole } from "@/lib/adminSections";

const updateSchema = z.object({
  role: z.enum(["owner", "admin", "editor"]),
  allowedSections: z.array(z.enum(ALL_SECTIONS as [string, ...string[]])).optional(),
  newPassword: z.string().min(8).optional(),
});

function requireOwner(request: NextRequest) {
  const session = parseSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  return session?.role === "owner" ? session : null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireOwner(request)) {
    return NextResponse.json({ error: "Only the owner can manage admin access" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { role, allowedSections, newPassword } = parsed.data;
  const supabase = supabaseServer();

  // Guard against locking everyone out of Users management: if this account
  // is the last remaining owner, block any change that would leave it
  // either not an owner, or an owner with no access to the Users section
  // (which, with the always-visible toggle UI, is now a single accidental
  // click away instead of requiring a deliberate multi-step edit).
  const { data: currentUser } = await supabase.from("admin_users").select("role").eq("id", id).single();
  if (currentUser?.role === "owner") {
    const { data: owners } = await supabase.from("admin_users").select("id").eq("role", "owner");
    const isLastOwner = (owners ?? []).length <= 1;
    if (isLastOwner) {
      const willRetainUsersAccess =
        role === "owner" && sectionsForRole(role, allowedSections).includes("users");
      if (!willRetainUsersAccess) {
        return NextResponse.json(
          { error: "Can't remove the last remaining owner's access to Users management" },
          { status: 400 }
        );
      }
    }
  }

  const update: Record<string, unknown> = {
    role,
    allowed_sections: allowedSections && allowedSections.length > 0 ? allowedSections : null,
  };
  if (newPassword) {
    update.password_hash = hashPassword(newPassword);
    update.must_change_password = true;
  }

  const { error } = await supabase.from("admin_users").update(update).eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Could not update that user" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = requireOwner(request);
  if (!session) {
    return NextResponse.json({ error: "Only the owner can revoke admin access" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = supabaseServer();

  // Guard against locking everyone out: don't allow removing the last
  // remaining owner (including the owner trying to revoke their own access).
  const { data: owners } = await supabase.from("admin_users").select("id").eq("role", "owner");
  const isTargetAnOwner = (owners ?? []).some((o) => o.id === id);
  if (isTargetAnOwner && (owners ?? []).length <= 1) {
    return NextResponse.json({ error: "Can't remove the last remaining owner" }, { status: 400 });
  }

  const { error } = await supabase.from("admin_users").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Could not revoke access" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
