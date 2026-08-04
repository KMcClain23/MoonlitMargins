import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Whether this member has finished orientation -- the single check gating
 * Contacts/Reviews in the portal nav (see PortalTopBar's orientationCompleted
 * prop, set in portal/layout.tsx) and enforced again as a server-side
 * redirect directly on those two pages, so "hidden in nav" and "blocked if
 * you navigate there anyway" can never drift apart.
 */
export async function hasCompletedOrientation(supabase: SupabaseClient, memberId: string): Promise<boolean> {
  const { data: member } = await supabase
    .from("members")
    .select("orientation_completed_at")
    .eq("id", memberId)
    .maybeSingle();

  return Boolean(member?.orientation_completed_at);
}
