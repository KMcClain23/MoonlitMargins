import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/password";
import { SESSION_COOKIE, parseSessionToken } from "@/lib/adminAuth";
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
  const session = parseSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  return session?.role === "owner" ? session : null;
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
  });

  if (error) {
    return NextResponse.json({ error: "Could not create that account -- is that email already in use?" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
