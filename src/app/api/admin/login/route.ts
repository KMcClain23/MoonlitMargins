import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie, verifyCredentials } from "@/lib/adminAuth";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Enter your email and password" }, { status: 400 });
  }

  const session = await verifyCredentials(email, password);

  // Deliberately the same error for "no such email" and "wrong password" --
  // don't reveal which emails have backend access to someone probing the
  // login form.
  if (!session) {
    return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  setSessionCookie(response, session);
  return response;
}
