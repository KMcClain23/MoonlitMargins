import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/adminAuth";
import { createLinkState } from "@/lib/googleAuth";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

/**
 * Starts the "link a Google account" flow -- requires an existing valid
 * session (this is an authenticated action, not a login), then redirects
 * to the same Google consent screen the login flow uses, but with a
 * signed `state` param carrying this session's adminUserId. GET
 * /api/admin/auth/google/callback checks for that state to tell this
 * flow apart from a plain login attempt and know which admin_user row to
 * update once Google redirects back.
 */
export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI!,
    response_type: "code",
    scope: "openid email profile",
    state: createLinkState(session.adminUserId),
  });

  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}
