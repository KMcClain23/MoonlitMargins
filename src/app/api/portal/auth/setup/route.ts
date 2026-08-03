import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/password";
import { setMemberSessionCookie } from "@/lib/memberAuth";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: NextRequest) {
  const { token, password } = await request.json();

  if (!token || typeof token !== "string" || !password || typeof password !== "string") {
    return NextResponse.json({ error: "A token and password are required" }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { data: member } = await supabase
    .from("members")
    .select("id, full_name, email, auth_setup_token_expires_at")
    .eq("auth_setup_token", token)
    .maybeSingle();

  // Same generic failure for "no such token" and "token expired" -- no
  // reason to tell a stranger poking at this endpoint which is which.
  if (!member || !member.auth_setup_token_expires_at || new Date(member.auth_setup_token_expires_at) < new Date()) {
    return NextResponse.json({ error: "This setup link is invalid or has expired" }, { status: 400 });
  }

  // Shouldn't happen in practice -- the invite email (see applications/
  // [id]/route.ts) is only ever sent when there's an email on file to
  // send it to -- but a member with no email can't have a usable login
  // identity, so this fails closed rather than creating one anyway.
  if (!member.email) {
    return NextResponse.json({ error: "This account has no email on file. Contact us for help." }, { status: 400 });
  }

  const { error } = await supabase
    .from("members")
    .update({
      password_hash: hashPassword(password),
      auth_setup_token: null,
      auth_setup_token_expires_at: null,
    })
    .eq("id", member.id);

  if (error) {
    return NextResponse.json({ error: "Could not set up your account. Try again." }, { status: 500 });
  }

  const response = NextResponse.json({ success: true });
  setMemberSessionCookie(response, { memberId: member.id, fullName: member.full_name, email: member.email });
  return response;
}
