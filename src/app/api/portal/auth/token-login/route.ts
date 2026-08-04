import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createMemberSessionToken, verifyMemberCredentials } from "@/lib/memberAuth";
import { hasCompletedOrientation } from "@/lib/orientationStatus";

// Bearer-token counterpart to /api/portal/auth/login, for clients that
// can't rely on cookies (a native mobile client). Same credential check,
// same error shape/status as the cookie route -- the signed session token
// comes back in the JSON body instead of a Set-Cookie header, exactly
// mirroring /api/admin/auth/token-login's relationship to /api/admin/login.
export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Enter your email and password" }, { status: 400 });
  }

  const session = await verifyMemberCredentials(email, password);

  if (!session) {
    return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
  }

  const token = createMemberSessionToken(session);

  // Not part of the signed session payload itself -- just a convenience
  // so a native client can route straight to the orientation checklist or
  // past it on first launch, without a second round trip.
  const orientationCompleted = await hasCompletedOrientation(supabaseServer(), session.memberId);

  return NextResponse.json({ token, ...session, orientationCompleted });
}
