import { NextRequest, NextResponse } from "next/server";
import { setMemberSessionCookie, verifyMemberCredentials } from "@/lib/memberAuth";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Enter your email and password" }, { status: 400 });
  }

  const session = await verifyMemberCredentials(email, password);

  // Deliberately the same error for "no such email," "no password set up
  // yet," and "wrong password" -- same reasoning as the admin login
  // route: don't reveal which emails have a portal account to someone
  // probing the login form.
  if (!session) {
    return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  setMemberSessionCookie(response, session);
  return response;
}
