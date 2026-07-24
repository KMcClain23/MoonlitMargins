import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/adminAuth";
import {
  findAdminUserByGoogleEmail,
  linkGoogleEmailToAdminUser,
  verifyGoogleIdToken,
  verifyLinkState,
} from "@/lib/googleAuth";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

/**
 * Google redirects here with a `code` after the person approves (or
 * denies) access on the consent screen -- for BOTH flows that send them
 * to Google: plain login (GET /api/admin/auth/google) and linking a
 * Google account to an already-signed-in admin
 * (GET /api/admin/auth/google/link). A present and validly-signed
 * `state` param means this is the linking flow; its absence means login,
 * exactly as this route behaved before linking existed.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const linkingAdminUserId = verifyLinkState(request.nextUrl.searchParams.get("state"));
  const isLinking = linkingAdminUserId !== null;

  // Where to bounce back to on any failure -- the account page mid-link,
  // the login page mid-login. Success has its own explicit redirects
  // below, since where it lands differs by outcome, not just by mode.
  function failureRedirect(error: string) {
    const url = new URL(isLinking ? "/admin/account" : "/admin/login", request.url);
    url.searchParams.set("error", error);
    return NextResponse.redirect(url);
  }

  if (!code) {
    return failureRedirect("google_failed");
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
      return failureRedirect("google_failed");
    }

    const tokenData = await tokenResponse.json();
    const idToken = tokenData.id_token;
    if (typeof idToken !== "string") {
      return failureRedirect("google_failed");
    }

    const email = await verifyGoogleIdToken(idToken);

    if (isLinking) {
      const result = await linkGoogleEmailToAdminUser(linkingAdminUserId, email);
      const accountUrl = new URL("/admin/account", request.url);
      if (result === "linked") {
        accountUrl.searchParams.set("linked", "success");
      } else {
        accountUrl.searchParams.set("error", result === "already_linked" ? "already_linked" : "google_failed");
      }
      return NextResponse.redirect(accountUrl);
    }

    const session = await findAdminUserByGoogleEmail(email);

    if (!session) {
      return failureRedirect("no_account");
    }

    // /admin itself redirects to /admin/applications (see
    // src/app/admin/page.tsx) -- the same landing spot the password
    // login page's router.push("/admin/applications") uses.
    const response = NextResponse.redirect(new URL("/admin", request.url));
    setSessionCookie(response, session);
    return response;
  } catch {
    return failureRedirect("google_failed");
  }
}
