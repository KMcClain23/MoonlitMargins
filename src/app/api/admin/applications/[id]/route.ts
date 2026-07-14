import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { updateApplicationStatusInSheet } from "@/lib/googleSheets";

const VALID_STATUSES = ["pending", "in_review", "accepted", "declined"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status } = await request.json();

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { error, data: updated } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", id)
    .select("kind")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  try {
    await updateApplicationStatusInSheet(id, status, updated.kind);
  } catch {
    // Same "never block on this" rule as everywhere else this syncs.
  }

  return NextResponse.json({ success: true });
}
