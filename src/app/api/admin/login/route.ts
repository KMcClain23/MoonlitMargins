import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { setSessionCookie, verifyCredentials } from "@/lib/adminAuth";
import { mintAdminLinkedMemberSession, setMemberSessionCookie } from "@/lib/memberAuth";

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

  // If this admin is also linked to a member record, also set the member
  // session cookie for it -- the same bridge the mobile app's bearer-token
  // login mints (see /api/admin/auth/token-login), just as a cookie here
  // instead of a token in the response body. This is what lets
  // /admin/contacts and /admin/reviews (thin wrappers around the exact
  // same PortalContactsView/PortalReviewsView the real member portal uses)
  // work for this admin with zero page-specific logic: those components
  // just fetch /api/portal/*, and the browser now has a valid
  // member_session cookie to send along.
  if (session.memberId) {
    const linked = await mintAdminLinkedMemberSession(supabaseServer(), session.memberId, session.sections);
    if (linked) {
      setMemberSessionCookie(response, linked);
    }
  }

  return response;
}
