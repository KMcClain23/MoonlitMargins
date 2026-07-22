import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const VALID_KINDS = ["all", "member", "interview", "collab"];

// Auth + section-level access ("applications") are already enforced
// centrally by middleware.ts for every /api/admin/* route -- no session
// check here, same as applications/[id]/route.ts.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const kindParam = searchParams.get("kind") ?? "all";
  const kind = VALID_KINDS.includes(kindParam) ? kindParam : "all";
  const view = searchParams.get("view") === "archived" ? "archived" : "active";

  const supabase = supabaseServer();
  let query = supabase
    .from("applications")
    .select("id, kind, status, full_name, email, instagram_handle, tiktok_handle, answers, created_at")
    .order("created_at", { ascending: false });

  if (kind !== "all") {
    query = query.eq("kind", kind);
  }

  // Once an application is accepted or declined, it's resolved -- keep it
  // out of the default view so the working list only shows what still
  // needs attention. "Archived" surfaces the resolved ones on request.
  // Mirrors src/app/admin/applications/page.tsx's getApplications() exactly.
  if (view === "archived") {
    query = query.in("status", ["accepted", "declined"]);
  } else {
    query = query.in("status", ["pending", "in_review"]);
  }

  const { data: applications } = await query;

  return NextResponse.json({
    applications: (applications ?? []).map((application) => ({
      id: application.id,
      kind: application.kind,
      status: application.status,
      fullName: application.full_name,
      email: application.email,
      instagramHandle: application.instagram_handle,
      tiktokHandle: application.tiktok_handle,
      answers: application.answers,
      createdAt: application.created_at,
    })),
  });
}
