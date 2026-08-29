import "server-only";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

/**
 * Supabase client with the service role key.
 *
 * ⚠️ This client bypasses Row Level Security entirely. It exists for the one
 * operation a member session genuinely cannot perform — deleting an account
 * from auth.users — and must never be used to "make a query work" that RLS is
 * refusing. If RLS is in the way, the policy is the thing to fix.
 *
 * The "server-only" import above is load-bearing: importing this file from a
 * Client Component is a build error, not a silent key leak. The variable is
 * deliberately not NEXT_PUBLIC_ for the same reason.
 */
export function createAdminSupabase() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local and to the Vercel project settings — never with a NEXT_PUBLIC_ prefix.",
    );
  }

  return createAdminClient(supabaseUrl(), serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
