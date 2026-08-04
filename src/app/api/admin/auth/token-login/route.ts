import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createSessionToken, verifyCredentials } from "@/lib/adminAuth";
import { createMemberSessionToken, mintAdminLinkedMemberSession } from "@/lib/memberAuth";

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

  // If this admin is also linked to a member record (session.memberId), also
  // mint a member bearer token for it -- lets an admin who's also a member
  // (e.g. the owner) reach the member-only Contacts/Reviews/Profile screens
  // in the mobile app without a second login. No separate password check
  // needed: the admin credential check above already proved who this is,
  // and the member_id link is trusted server-side data, not user input.
  let member: { token: string; fullName: string; email: string } | null = null;
  if (session.memberId) {
    const linked = await mintAdminLinkedMemberSession(supabaseServer(), session.memberId, session.sections);
    if (linked) {
      member = { token: createMemberSessionToken(linked), fullName: linked.fullName, email: linked.email };
    }
  }

  return NextResponse.json({ token, ...session, member });
}
