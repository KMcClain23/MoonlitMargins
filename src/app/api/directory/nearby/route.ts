import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { STATE_NEIGHBORS } from "@/lib/stateAdjacency";

// Public route (no auth, not under /api/admin) -- meant for prospective
// members and visitors browsing "Find a Sister," not just logged-in
// admins.

// "First L." -- first word of full_name as-is, plus the first letter of
// the last word followed by a period. full_name itself is never exposed
// to this public endpoint, only this derived, already-anonymized form.
function formatDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!;
  const lastInitial = parts[parts.length - 1]?.[0] ?? "";
  return `${parts[0]} ${lastInitial}.`;
}

export async function GET(request: NextRequest) {
  const supabase = supabaseServer();

  const rawCountry = request.nextUrl.searchParams.get("country");
  const country = rawCountry?.trim() ?? "";

  // Country path: exact match (case-insensitive) against members.country,
  // no adjacency concept -- entirely separate from, and doesn't disturb,
  // the state-based path below. `country` in the result in place of
  // `state`, since state isn't meaningful here.
  if (country) {
    const { data: members } = await supabase
      .from("members")
      .select("full_name, photo_url, photo_zoom, photo_offset_x, photo_offset_y, country")
      .ilike("country", country)
      .eq("hide_from_directory", false);

    const results = (members ?? []).map((m) => ({
      displayName: formatDisplayName(m.full_name),
      photoUrl: m.photo_url,
      photoZoom: m.photo_zoom,
      photoOffsetX: m.photo_offset_x,
      photoOffsetY: m.photo_offset_y,
      country: m.country,
    }));

    return NextResponse.json(results);
  }

  const rawState = request.nextUrl.searchParams.get("state");
  const state = rawState?.trim().toUpperCase() ?? "";

  if (!state || !(state in STATE_NEIGHBORS)) {
    return NextResponse.json({ error: "A valid two-letter state code is required" }, { status: 400 });
  }

  const searchStates = [state, ...STATE_NEIGHBORS[state]!];

  // .in() never matches a null state on its own, so this already
  // satisfies "state is not null" without a separate filter.
  const { data: members } = await supabase
    .from("members")
    .select("full_name, photo_url, photo_zoom, photo_offset_x, photo_offset_y, state")
    .in("state", searchStates)
    .eq("hide_from_directory", false);

  const results = (members ?? [])
    .map((m) => ({
      displayName: formatDisplayName(m.full_name),
      photoUrl: m.photo_url,
      photoZoom: m.photo_zoom,
      photoOffsetX: m.photo_offset_x,
      photoOffsetY: m.photo_offset_y,
      state: m.state,
    }))
    // Exact-match state first, then neighbors -- a stable sort keeps each
    // group's relative (DB-returned) order otherwise, no secondary key
    // needed beyond that.
    .sort((a, b) => (a.state === state ? 0 : 1) - (b.state === state ? 0 : 1));

  return NextResponse.json(results);
}
