import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { SESSION_COOKIE, createSessionToken, parseSessionToken } from "@/lib/adminAuth";
import { hashPassword, verifyPassword } from "@/lib/password";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = parseSessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { currentPassword, newPassword } = parsed.data;
  const supabase = supabaseServer();

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("id, password_hash")
    .eq("id", session.adminUserId)
    .single();

  if (!adminUser || !verifyPassword(currentPassword, adminUser.password_hash)) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  const { error } = await supabase
    .from("admin_users")
    .update({ password_hash: hashPassword(newPassword), must_change_password: false })
    .eq("id", session.adminUserId);

  if (error) {
    return NextResponse.json({ error: "Could not update password" }, { status: 500 });
  }

  // Reissue the session cookie with mustChangePassword cleared -- otherwise
  // the still-cached old session would keep middleware redirecting back to
  // this same page immediately after a successful change, since sessions
  // don't refresh mid-request on their own.
  const response = NextResponse.json({ success: true });
  response.cookies.set(
    SESSION_COOKIE,
    createSessionToken({ ...session, mustChangePassword: false }),
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
