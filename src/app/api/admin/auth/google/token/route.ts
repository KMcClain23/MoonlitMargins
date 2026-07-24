import { NextRequest, NextResponse } from "next/server";
import { createSessionToken } from "@/lib/adminAuth";
import { findAdminUserByGoogleEmail, verifyGoogleIdToken } from "@/lib/googleAuth";

/**
 * Mobile counterpart to the web OAuth callback -- the native Google
 * Sign-In SDK produces an ID token directly on-device, so there's no
 * authorization-code exchange to do here (unlike the web redirect flow);
 * this just verifies the token Google already issued and looks up the
 * matching admin account. Returns the exact same JSON shape as
 * POST /api/admin/auth/token-login (token + the spread session fields)
 * so the mobile app's existing session-saving code works unchanged
 * regardless of which login method produced it.
 */
export async function POST(request: NextRequest) {
  const { idToken } = await request.json();

  if (typeof idToken !== "string" || !idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  let email: string;
  try {
    email = await verifyGoogleIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Could not verify this Google account" }, { status: 401 });
  }

  const session = await findAdminUserByGoogleEmail(email);

  if (!session) {
    return NextResponse.json({ error: "No admin account found for this Google email" }, { status: 403 });
  }

  const token = createSessionToken(session);
  return NextResponse.json({ token, ...session });
}
