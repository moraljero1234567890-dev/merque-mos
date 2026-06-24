import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

/**
 * Browser Supabase client. Returns null when env vars are absent so the app
 * can run fully on the local store (zero-config demo mode).
 */
export function createClient() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}

export { isSupabaseConfigured };
