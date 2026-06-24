import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// In this version of Next.js the `middleware` convention was renamed to
// `proxy`. This runs before every rendered route to refresh the Supabase
// session and protect the app shell. No-ops in demo mode (no env vars).
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Run on everything except Next internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
