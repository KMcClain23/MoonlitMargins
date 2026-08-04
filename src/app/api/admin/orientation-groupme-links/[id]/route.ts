import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionFromRequest } from "@/lib/adminAuth";

const updateSchema = z.object({
  label: z.string().min(1).optional(),
  url: z.string().url().optional(),
  sortOrder: z.number().int().optional(),
});

function requireOwner(request: NextRequest) {
  const session = getSessionFromRequest(request);
  return session?.role === "owner" ? session : null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireOwner(request)) {
    return NextResponse.json({ error: "Only the owner can manage GroupMe links" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { label, url, sortOrder } = parsed.data;

  // Partial update -- same reasoning as orientation-steps' PATCH: the
  // admin page uses this endpoint both for editing label/url and for the
  // up/down reorder buttons (which only ever send sortOrder).
  const update: Record<string, unknown> = {};
  if (label !== undefined) update.label = label;
  if (url !== undefined) update.url = url;
  if (sortOrder !== undefined) update.sort_order = sortOrder;

  const supabase = supabaseServer();
  const { error } = await supabase.from("orientation_groupme_links").update(update).eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Could not update that link" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireOwner(request)) {
    return NextResponse.json({ error: "Only the owner can manage GroupMe links" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = supabaseServer();
  const { error } = await supabase.from("orientation_groupme_links").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Could not delete that link" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
