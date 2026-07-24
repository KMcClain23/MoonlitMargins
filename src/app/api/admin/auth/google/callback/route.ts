import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/adminAuth";
import { findAdminUserByGoogleEmail, verifyGoogleIdToken } from "@/lib/googleAuth";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

/**
 * Google redirects here with a `code` after the person approves (or
 * denies) access on the consent screen. Exchanges that code for tokens,
 * verifies the id_token, and looks up a matching admin_users row by
 * email -- issues the exact same signed session cookie the password
 * login route does (via setSessionCookie, shared rather than
 * reimplemented) if found, or bounces back to the login page with an
 * error query param if not. Never creates a new admin account.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const loginUrl = new URL("/admin/login", request.url);

  if (!code) {
    loginUrl.searchParams.set("error", "google_failed");
    return NextResponse.redirect(loginUrl);
  }

  try {
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI!,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      loginUrl.searchParams.set("error", "google_failed");
      return NextResponse.redirect(loginUrl);
    }

    const tokenData = await tokenResponse.json();
    const idToken = tokenData.id_token;
    if (typeof idToken !== "string") {
      loginUrl.searchParams.set("error", "google_failed");
      return NextResponse.redirect(loginUrl);
    }

    const email = await verifyGoogleIdToken(idToken);
    const session = await findAdminUserByGoogleEmail(email);

    if (!session) {
      loginUrl.searchParams.set("error", "no_account");
      return NextResponse.redirect(loginUrl);
    }

    // /admin itself redirects to /admin/applications (see
    // src/app/admin/page.tsx) -- the same landing spot the password
    // login page's router.push("/admin/applications") uses.
    const response = NextResponse.redirect(new URL("/admin", request.url));
    setSessionCookie(response, session);
    return response;
  } catch {
    loginUrl.searchParams.set("error", "google_failed");
    return NextResponse.redirect(loginUrl);
  }
}
