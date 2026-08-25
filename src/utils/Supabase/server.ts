/**
 * ⚠️ Superseded — the real server auth helper lives in `lib/supabase/server.ts`.
 *
 * This file re-exports it so any old import path keeps working, but new code
 * should import from "@/lib/supabase/server" directly.
 *
 * Why the previous version of this file was removed: it created a
 * `@supabase/supabase-js` client once, at module scope, with no cookie
 * handling. On the server that client can never see the signed-in user —
 * `getUser()` is always null and every query runs as `anon` under RLS. And
 * because one instance is shared by all concurrent requests, giving it a
 * session would leak one member's auth into another member's request.
 *
 * The helper in `lib/supabase/server.ts` creates a fresh client per request,
 * wired to that request's cookies via @supabase/ssr — which is what makes
 * Server Actions and Server Components see the correct user.
 */
export { createClient } from "@/lib/supabase/server";
