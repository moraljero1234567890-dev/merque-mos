// Centralized Supabase env. Each NEXT_PUBLIC_* must be referenced as a static
// member access so Next.js can inline it into the browser bundle. We accept the
// new publishable key (sb_publishable_…) and fall back to the legacy anon key.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = () => Boolean(SUPABASE_URL && SUPABASE_KEY);
