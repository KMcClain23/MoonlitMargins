import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionFromRequest } from "@/lib/adminAuth";

const linkSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
});

// Same precedent as /api/admin/orientation-steps: "orientation-groupme-
// links" isn't a section in adminSections.ts, so middleware doesn't gate it
// at all -- enforced here instead, owner-only per this task's own scope.
function requireOwner(request: NextRequest) {
  const session = getSessionFromRequest(request);
  return session?.role === "owner" ? session : null;
}

export async function GET(request: NextRequest) {
  if (!requireOwner(request)) {
    return NextResponse.json({ error: "Only the owner can manage GroupMe links" }, { status: 403 });
  }

  const supabase = supabaseServer();
  const { data: links } = await supabase
    .from("orientation_groupme_links")
    .select("id, label, url, sort_order")
    .order("sort_order", { ascending: true });

  return NextResponse.json({
    links: (links ?? []).map((l) => ({
      id: l.id,
      label: l.label,
      url: l.url,
      sortOrder: l.sort_order,
    })),
  });
}

export async function POST(request: NextRequest) {
  if (!requireOwner(request)) {
    return NextResponse.json({ error: "Only the owner can manage GroupMe links" }, { status: 403 });
  }

  const parsed = linkSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const supabase = supabaseServer();

  // New links always go last -- matches orientation-steps' own "reordering
  // from there is what the admin page's up/down buttons are for" pattern.
  const { data: last } = await supabase
    .from("orientation_groupme_links")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("orientation_groupme_links").insert({
    label: parsed.data.label,
    url: parsed.data.url,
    sort_order: (last?.sort_order ?? -1) + 1,
  });

  if (error) {
    return NextResponse.json({ error: "Could not add that link" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
