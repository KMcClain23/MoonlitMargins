import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = supabaseServer();

  const { data } = await supabase
    .from("member_orientation_assignments")
    .select("orientation_step_id")
    .eq("member_id", id);

  return NextResponse.json({ stepIds: (data ?? []).map((row) => row.orientation_step_id) });
}

const updateSchema = z.object({
  // null means "no customization" -- revert to the default full checklist.
  // An explicit array (even an empty one) replaces whatever was there.
  stepIds: z.array(z.string().uuid()).nullable(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const supabase = supabaseServer();

  // Always replace from a clean slate -- simpler than diffing old vs new,
  // and this table is small per member.
  const { error: deleteError } = await supabase
    .from("member_orientation_assignments")
    .delete()
    .eq("member_id", id);

  if (deleteError) {
    return NextResponse.json({ error: "Could not update orientation assignment" }, { status: 500 });
  }

  const { stepIds } = parsed.data;

  if (stepIds && stepIds.length > 0) {
    const { error: insertError } = await supabase
      .from("member_orientation_assignments")
      .insert(stepIds.map((stepId) => ({ member_id: id, orientation_step_id: stepId })));

    if (insertError) {
      return NextResponse.json({ error: "Could not update orientation assignment" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
