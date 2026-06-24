import { createClient as createSb } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/**
 * Service-role client. SERVER ONLY — never import from a client component.
 * Reads SUPABASE_SERVICE_ROLE_KEY (not a NEXT_PUBLIC var). Returns null when
 * unset so callers can degrade gracefully.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) return null;
  return createSb(SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
