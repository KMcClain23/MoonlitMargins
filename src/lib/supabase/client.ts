import { createClient } from "@supabase/supabase-js";

/**
 * Anon-key client for public, read-only data (events, members, memories).
 * Safe to use in client components — RLS policies restrict it to
 * select-only access, see supabase/schema.sql.
 */
export function supabaseBrowser() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
