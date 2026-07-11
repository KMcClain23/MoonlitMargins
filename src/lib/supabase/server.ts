import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for server-only use (API routes, server actions).
 * Never import this from a client component — the service role key
 * bypasses row-level security entirely.
 */
export function supabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
