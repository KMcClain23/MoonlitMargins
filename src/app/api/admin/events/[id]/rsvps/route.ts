import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("event_rsvps")
    .select("id, first_name, last_name, email, created_at")
    .eq("event_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Could not load RSVPs" }, { status: 500 });
  }

  return NextResponse.json({ rsvps: data ?? [] });
}
