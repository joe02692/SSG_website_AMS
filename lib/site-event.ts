import "server-only";

import { unstable_cache } from "next/cache";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n/config";

/**
 * The public event countdown (migration 0023, table `site_event`, one row).
 *
 * Every public page shows it, so reading it must never slow a page down or
 * break one:
 *   • the row is cached for a minute and shared by every visitor
 *     (unstable_cache, tag SITE_EVENT_TAG); saving from /admin clears it at once
 *   • the read gives up after 1.5 s — a paused or slow database means no
 *     countdown, not a hanging page
 *   • any error (including "migration 0023 not run yet") means no countdown
 */

export const SITE_EVENT_TAG = "site-event";

/** The fixed timezone the head admin types the start time in. */
export const EVENT_TIMEZONE = "Africa/Cairo";

export type SiteEventRow = {
  enabled: boolean;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  starts_at: string | null;
};

/** What the countdown card needs, already in the visitor's language. */
export type PublicEvent = {
  title: string;
  description: string;
  startsAt: string;
};

const COLUMNS = "enabled, title_ar, title_en, description_ar, description_en, starts_at";
const READ_TIMEOUT_MS = 1500;

/**
 * Cached for everyone. A plain client with no cookies on purpose: the row is
 * public, and a cookie-bound client would make the cache per-visitor.
 */
const readCached = unstable_cache(
  async (): Promise<SiteEventRow | null> => {
    try {
      const supabase = createPlainClient(supabaseUrl(), supabaseAnonKey(), {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await supabase
        .from("site_event")
        .select(COLUMNS)
        .eq("id", 1)
        .abortSignal(AbortSignal.timeout(READ_TIMEOUT_MS))
        .maybeSingle();
      if (error || !data) return null;
      return data as SiteEventRow;
    } catch {
      return null;
    }
  },
  ["site-event-row"],
  { tags: [SITE_EVENT_TAG], revalidate: 60 },
);

/** The countdown to show right now, or null for none. */
export async function getPublicEvent(locale: Locale): Promise<PublicEvent | null> {
  const row = await readCached();
  if (!row || !row.enabled || !row.starts_at) return null;
  // Already started: nothing to count down to.
  if (new Date(row.starts_at).getTime() <= Date.now()) return null;
  const title = (locale === "en" && row.title_en.trim()) || row.title_ar.trim();
  const description =
    (locale === "en" && row.description_en.trim()) || row.description_ar.trim();
  return { title, description, startsAt: row.starts_at };
}

/**
 * The row for the Admin form. Read through the member's own session (not the
 * cache), so the form always shows what is saved. `missing` means migration
 * 0023 hasn't been run.
 */
export async function getEventForEdit(): Promise<{ row: SiteEventRow | null; missing: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_event")
    .select(COLUMNS)
    .eq("id", 1)
    .maybeSingle();
  if (error) return { row: null, missing: true };
  return { row: (data as SiteEventRow | null) ?? null, missing: !data };
}

// ------------------------------------------------------------ Cairo time

/** Minutes Cairo is ahead of UTC at a given instant (DST-aware). */
function cairoOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TIMEZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return Math.round((asUtc - at.getTime()) / 60_000);
}

/**
 * "2026-10-31T04:00" typed as Cairo time → the exact instant (ISO, UTC).
 * Returns null if the text isn't a real date and time.
 */
export function cairoLocalToIso(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const naive = Date.UTC(y, mo - 1, d, h, mi);
  const check = new Date(naive);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
    return null;
  }
  // Two passes, so a time right next to a daylight-saving change still lands
  // on the right offset.
  let instant = naive - cairoOffsetMinutes(new Date(naive)) * 60_000;
  instant = naive - cairoOffsetMinutes(new Date(instant)) * 60_000;
  return new Date(instant).toISOString();
}

/** The saved instant → "YYYY-MM-DDTHH:mm" in Cairo time, for the form. */
export function isoToCairoLocal(iso: string | null): string {
  if (!iso) return "";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  const shifted = new Date(at.getTime() + cairoOffsetMinutes(at) * 60_000);
  return shifted.toISOString().slice(0, 16);
}
