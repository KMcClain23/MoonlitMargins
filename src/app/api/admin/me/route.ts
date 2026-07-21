import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);

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
    canAssignTasks: session.canAssignTasks,
  });
}
