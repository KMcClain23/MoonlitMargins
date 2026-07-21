import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, verifyCredentials } from "@/lib/adminAuth";

// Bearer-token counterpart to /api/admin/login, for clients that can't rely
// on cookies (the React Native admin app). Same credential check, same
// error shape/status -- the only difference is the signed session token
// comes back in the JSON body instead of a Set-Cookie header.
export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Enter your email and password" }, { status: 400 });
  }

  const session = await verifyCredentials(email, password);

  if (!session) {
    return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
  }

  const token = createSessionToken(session);
  return NextResponse.json({ token, ...session });
}
