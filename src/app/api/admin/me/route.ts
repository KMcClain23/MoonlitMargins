import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, parseSessionToken } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = parseSessionToken(token);

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({
    adminUserId: session.adminUserId,
    memberId: session.memberId,
    fullName: session.fullName,
    role: session.role,
    sections: session.sections,
    mustChangePassword: session.mustChangePassword,
  });
}
