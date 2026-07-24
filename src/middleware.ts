import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/adminAuth";
import { sectionForPath } from "@/lib/adminSections";

// Routes that issue a session rather than requiring one -- all must stay
// reachable without auth, the same way /api/admin/login always has.
// Google's redirect flow (google + google/callback) and the mobile
// token exchange (google/token) are no different: whoever hits them
// doesn't have a session yet by definition.
const AUTH_BYPASS_API_PATHS = [
  "/api/admin/login",
  "/api/admin/auth/token-login",
  "/api/admin/auth/google",
  "/api/admin/auth/google/callback",
  "/api/admin/auth/google/token",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isLoginRoute = pathname === "/admin/login";
  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin") && !AUTH_BYPASS_API_PATHS.includes(pathname);

  if (!isAdminRoute && !isAdminApi) {
    return NextResponse.next();
  }

  // Resolves either a bearer token (the React Native admin app) or the
  // existing session cookie (web admin) -- see getSessionFromRequest for
  // why bearer is checked first and doesn't fall back to the cookie.
  const session = getSessionFromRequest(request);

  if (isAdminApi && !session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (isAdminRoute && !isLoginRoute && !session) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginRoute && session) {
    const dashboardUrl = new URL("/admin/applications", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // GET /api/admin/users powers the messages composer's recipient picker
  // for every authenticated admin_user, not just owners who have "users"
  // in their sections -- unlike POST (creating new admin accounts), which
  // stays owner-only via both this section gate and the route's own
  // requireOwner() check.
  const isUsersListRequest = pathname === "/api/admin/users" && request.method === "GET";

  // PATCH /api/admin/members/me/photo lets anyone with a linked member
  // profile update their own photo, regardless of "members" section
  // access -- that section is about managing the whole roster, a
  // different concern from editing your own picture. The route itself
  // further narrows this to session.memberId's own row and only its
  // photo_* columns, so bypassing the section gate here doesn't grant
  // anything beyond that.
  const isOwnPhotoUpdateRequest = pathname === "/api/admin/members/me/photo" && request.method === "PATCH";

  // Section-level access control: being logged in isn't enough on its own --
  // a role (or a member's specific allowed_sections override) can still
  // block a given admin area, e.g. an "editor" reaching /admin/users.
  if (session) {
    const section = sectionForPath(pathname);
    if (section && !isUsersListRequest && !isOwnPhotoUpdateRequest && !session.sections.includes(section)) {
      if (isAdminApi) {
        return NextResponse.json({ error: "Not authorized for this section" }, { status: 403 });
      }
      // Redirect to the first section they DO have access to, rather than
      // bouncing them straight back into another blocked page.
      const fallback = session.sections[0] ?? "applications";
      return NextResponse.redirect(new URL(`/admin/${fallback}`, request.url));
    }
  }

  // Still on a temporary password (freshly created, or reset by someone
  // else) -- block everything except the account page itself, changing the
  // password, and signing out, until a real password is set. /api/admin/me
  // has to stay reachable too: both AccountPage (to know whether to show
  // the "temporary password" banner) and AdminNav (to know the signed-in
  // person's session at all) depend on it, and without it those requests
  // 403 and leave every page acting as if no one is logged in.
  const CHANGE_PASSWORD_EXCEPTIONS = [
    "/admin/account",
    "/api/admin/account/password",
    "/api/admin/logout",
    "/api/admin/me",
  ];
  if (session?.mustChangePassword && !CHANGE_PASSWORD_EXCEPTIONS.includes(pathname)) {
    if (isAdminApi) {
      return NextResponse.json({ error: "Change your password before continuing" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/admin/account", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
  runtime: "nodejs",
};
