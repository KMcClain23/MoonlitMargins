import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberSessionFromRequest } from "@/lib/memberAuth";

// Any authenticated member -- unlike the other /api/portal/orientation*
// routes, this isn't gated by memberSessionHasAdminSection("member_orientation")
// too. It's just a shared, non-personal list of chat links, not orientation
// progress -- there's no reason to also require the admin-bridge section an
// admin acting through their own linked member would need for the rest of
// the checklist.
export async function GET(request: NextRequest) {
  const session = getMemberSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = supabaseServer();
  const { data: links } = await supabase
    .from("orientation_groupme_links")
    .select("id, label, url")
    .order("sort_order", { ascending: true });

  return NextResponse.json({
    links: (links ?? []).map((l) => ({ id: l.id, label: l.label, url: l.url })),
  });
}
