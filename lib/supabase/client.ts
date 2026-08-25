"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Supabase client for Client Components.
 *
 * Most of the AMS should talk to Supabase from the server. Reach for this
 * only where the browser genuinely needs it — realtime subscriptions, or
 * direct-to-storage uploads that shouldn't round-trip through the server.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
