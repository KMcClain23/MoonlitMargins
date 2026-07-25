import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Public route (no auth, not under /api/admin) -- lets the "Find a
// Sister" frontend only offer country options that actually have
// members, rather than a static guessed list.
export async function GET() {
  const supabase = supabaseServer();
  const { data: members } = await supabase.from("members").select("country").eq("hide_from_directory", false);

  // United States is excluded -- that's handled by the existing
  // state-based search (GET /api/directory/nearby?state=XX), not this
  // country list. A plain Set dedupes exact-string repeats; countries
  // are admin-entered free text, so this doesn't attempt to also merge
  // case variants of the same country.
  const countries = new Set<string>();
  for (const m of members ?? []) {
    const country = m.country?.trim();
    if (country && country.toLowerCase() !== "united states") {
      countries.add(country);
    }
  }

  return NextResponse.json([...countries].sort());
}
