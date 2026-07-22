import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/password";
import { getSessionFromRequest } from "@/lib/adminAuth";
import { ALL_SECTIONS } from "@/lib/adminSections";

const grantSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["owner", "admin", "editor"]),
  memberId: z.string().uuid().optional(),
  allowedSections: z.array(z.enum(ALL_SECTIONS as [string, ...string[]])).optional(),
});

// Section-level access already gates /admin/users and /api/admin/users to
// "owner" via middleware (only the owner role's default sections include
// "users"), but double-checking role here too costs nothing and protects
// against a future change to that default list accidentally widening this.
function requireOwner(request: NextRequest) {
  const session = getSessionFromRequest(request);
  return session?.role === "owner" ? session : null;
}

// Unlike POST, any authenticated admin_user can list teammates (e.g. for
// the messages composer's recipient picker) -- this only requires a valid
// session, not the owner-only gate that requireOwner() enforces below.
export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = supabaseServer();
  const { data: users } = await supabase
    .from("admin_users")
    .select("id, full_name")
    .order("full_name", { ascending: true });

  return NextResponse.json({
    users: (users ?? [])
      .filter((user) => user.id !== session.adminUserId)
      .map((user) => ({ id: user.id, fullName: user.full_name })),
  });
}

export async function POST(request: NextRequest) {
  if (!requireOwner(request)) {
    return NextResponse.json({ error: "Only the owner can grant admin access" }, { status: 403 });
  }

  const parsed = grantSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { fullName, email, password, role, memberId, allowedSections } = parsed.data;
  const supabase = supabaseServer();

  const { error } = await supabase.from("admin_users").insert({
    full_name: fullName,
    email: email.toLowerCase().trim(),
    password_hash: hashPassword(password),
    role,
    member_id: memberId || null,
    allowed_sections: allowedSections && allowedSections.length > 0 ? allowedSections : null,
    must_change_password: true,
  });

  if (error) {
    return NextResponse.json({ error: "Could not create that account -- is that email already in use?" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
