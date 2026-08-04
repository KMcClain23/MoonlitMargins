import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A member with no rows here gets the full orientation checklist (every
 * orientation_steps row) -- the default, unchanged behavior for anyone an
 * admin has never customized. A member with one or more rows gets ONLY
 * those steps instead. Shared by the portal orientation page and both of
 * its API routes (GET .../orientation, POST .../[stepId]/complete) so
 * "what counts as this member's checklist" can never drift between them.
 */
export async function getAssignedStepIds(supabase: SupabaseClient, memberId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("member_orientation_assignments")
    .select("orientation_step_id")
    .eq("member_id", memberId);

  return new Set((data ?? []).map((row) => row.orientation_step_id as string));
}

/** Filters an already-fetched, already-ordered steps list down to a
 * member's assigned subset, or returns it unchanged if they have no
 * customization at all. */
export function applyStepAssignment<T extends { id: string }>(steps: T[], assignedStepIds: Set<string>): T[] {
  if (assignedStepIds.size === 0) return steps;
  return steps.filter((step) => assignedStepIds.has(step.id));
}
