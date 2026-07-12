import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, parseSessionToken } from "@/lib/adminAuth";
import { sectionForPath } from "@/lib/adminSections";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isLoginRoute = pathname === "/admin/login";
  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin") && pathname !== "/api/admin/login";

  if (!isAdminRoute && !isAdminApi) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = parseSessionToken(token);

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

  // Section-level access control: being logged in isn't enough on its own --
  // a role (or a member's specific allowed_sections override) can still
  // block a given admin area, e.g. an "editor" reaching /admin/users.
  if (session) {
    const section = sectionForPath(pathname);
    if (section && !session.sections.includes(section)) {
      if (isAdminApi) {
        return NextResponse.json({ error: "Not authorized for this section" }, { status: 403 });
      }
      // Redirect to the first section they DO have access to, rather than
      // bouncing them straight back into another blocked page.
      const fallback = session.sections[0] ?? "applications";
      return NextResponse.redirect(new URL(`/admin/${fallback}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
  runtime: "nodejs",
};
