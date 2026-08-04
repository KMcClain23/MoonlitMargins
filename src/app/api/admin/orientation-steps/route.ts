import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionFromRequest } from "@/lib/adminAuth";

const stepSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  // Defaults to "member" (matches the column's own DB default) so existing
  // callers that never send this field -- there weren't any before this
  // field existed, but a stale client bundle mid-rollout could still hit
  // this route without it -- keep creating ordinary self-completable steps.
  completionType: z.enum(["member", "admin"]).optional(),
});

// "orientation-steps" isn't a section in adminSections.ts, so middleware
// doesn't gate it at all -- enforced here instead, same precedent as
// Tickets/Users management (owner-only, checked per-method rather than by
// section).
function requireOwner(request: NextRequest) {
  const session = getSessionFromRequest(request);
  return session?.role === "owner" ? session : null;
}

export async function GET(request: NextRequest) {
  if (!requireOwner(request)) {
    return NextResponse.json({ error: "Only the owner can manage orientation steps" }, { status: 403 });
  }

  const supabase = supabaseServer();
  const { data: steps } = await supabase
    .from("orientation_steps")
    .select("id, title, description, sort_order, completion_type")
    .order("sort_order", { ascending: true });

  return NextResponse.json({
    steps: (steps ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      sortOrder: s.sort_order,
      completionType: s.completion_type,
    })),
  });
}

export async function POST(request: NextRequest) {
  if (!requireOwner(request)) {
    return NextResponse.json({ error: "Only the owner can manage orientation steps" }, { status: 403 });
  }

  const parsed = stepSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const supabase = supabaseServer();

  // New steps always go last -- reordering from there is what the
  // admin page's up/down buttons are for.
  const { data: last } = await supabase
    .from("orientation_steps")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("orientation_steps").insert({
    title: parsed.data.title,
    description: parsed.data.description || null,
    sort_order: (last?.sort_order ?? -1) + 1,
    completion_type: parsed.data.completionType ?? "member",
  });

  if (error) {
    return NextResponse.json({ error: "Could not add that step" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
