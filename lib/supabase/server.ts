import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * `cookies()` is async in Next.js 16 — synchronous access was removed
 * entirely in this major version, so the `await` below is mandatory.
 *
 * Wrapped in React `cache()`, so one request gets one client no matter how
 * many callers ask. A /members render previously built three (getCurrentUser,
 * getCurrentProfile, and the page itself), each with its own GoTrue and
 * PostgREST instance re-reading the cookie store.
 *
 * `cache()` is per-request, which is the only reason this is safe: a
 * module-scope singleton would share one user's cookies with the next
 * visitor. src/utils/Supabase/server.ts documents that exact bug.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Safe to ignore: proxy.ts refreshes the session on every request.
        }
      },
    },
  });
});
