import { NextResponse } from "next/server";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

// Kicks off the web OAuth flow -- a plain browser navigation (the "Sign
// in with Google" link/button points straight here), not a fetch, since
// this has to actually redirect the whole page to Google's consent
// screen. GET /api/admin/auth/google/callback picks up where this leaves
// off once Google redirects back with a `code`.
export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI!,
    response_type: "code",
    scope: "openid email profile",
  });

  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}
