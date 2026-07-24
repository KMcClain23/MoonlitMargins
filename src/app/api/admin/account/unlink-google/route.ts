import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/adminAuth";
import { supabaseServer } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = supabaseServer();
  const { error } = await supabase
    .from("admin_users")
    .update({ linked_google_email: null })
    .eq("id", session.adminUserId);

  if (error) {
    return NextResponse.json({ error: "Could not unlink Google account" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
