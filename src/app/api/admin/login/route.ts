import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, SESSION_COOKIE } from "@/lib/adminAuth";
import { sectionsForRole, type AdminRole } from "@/lib/adminSections";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Enter your email and password" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("id, full_name, email, password_hash, role, allowed_sections, member_id")
    .eq("email", String(email).toLowerCase().trim())
    .single();

  // Deliberately the same error for "no such email" and "wrong password" --
  // don't reveal which emails have backend access to someone probing the
  // login form.
  if (!adminUser || !verifyPassword(password, adminUser.password_hash)) {
    return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
  }

  const role = adminUser.role as AdminRole;
  const sections = sectionsForRole(role, adminUser.allowed_sections);

  const response = NextResponse.json({ success: true });
  response.cookies.set(
    SESSION_COOKIE,
    createSessionToken({
      adminUserId: adminUser.id,
      memberId: adminUser.member_id,
      fullName: adminUser.full_name,
      role,
      sections,
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    }
  );
  return response;
}
