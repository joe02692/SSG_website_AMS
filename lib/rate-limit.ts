import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * Per-visitor limits on the auth forms, stored in Postgres
 * (supabase/migrations/0019_rate_limits.sql).
 *
 * Keys are hashed before they leave the server, so the table never holds an
 * email or IP address in readable form.
 *
 * Fails OPEN: if the migration hasn't been run, or the database can't be
 * reached, the attempt is allowed and the problem is logged. A broken limiter
 * must never lock the whole group out of the site.
 */
export type Limit = {
  /** Short name, e.g. "signin-ip". */
  name: string;
  /** What is being counted — an IP address, an email, or both joined. */
  key: string;
  max: number;
  windowSeconds: number;
};

/** The visitor's address as Vercel reports it. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

function bucket({ name, key }: Limit): string {
  return `${name}:${createHash("sha256").update(key.toLowerCase()).digest("hex")}`;
}

/** True if every limit has room for this attempt (and records it). */
export async function withinLimits(limits: Limit[]): Promise<boolean> {
  let admin;
  try {
    admin = createAdminSupabase();
  } catch (error) {
    console.error("[rate-limit] no service-role key; limits are off", error);
    return true;
  }

  for (const limit of limits) {
    const { data, error } = await admin.rpc("rate_limit_hit", {
      p_bucket: bucket(limit),
      p_max: limit.max,
      p_window_seconds: limit.windowSeconds,
    });
    if (error) {
      console.error(
        "[rate-limit] check failed — has migration 0019 been run?",
        error.message,
      );
      return true;
    }
    if (data === false) return false;
  }
  return true;
}

export const MINUTE = 60;
export const HOUR = 60 * MINUTE;
