import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n/config";
import { publicImageUrl } from "@/lib/public-images";

/**
 * Upcoming events (migration 0028, table events). Everyone can read the
 * published ones; only the head site admin writes (app/admin/events-actions.ts).
 * Pinned events (0031) come first.
 */

export const EVENTS_TIMEZONE = "Africa/Cairo";

export type EventRow = {
  id: string;
  title_ar: string;
  title_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  location_ar: string | null;
  location_en: string | null;
  starts_at: string;
  ends_at: string | null;
  photo_key: string | null;
  published: boolean;
  /** Listed first on /events (0031). Missing before that migration. */
  pinned?: boolean;
  updated_at: string;
};

export type SiteEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  photo: string | null;
  pinned: boolean;
};

const BASE_COLUMNS =
  "id, title_ar, title_en, description_ar, description_en, location_ar, location_en, starts_at, ends_at, photo_key, published, updated_at";
const COLUMNS = `${BASE_COLUMNS}, pinned`;

/** "That column doesn't exist" — migration 0031 isn't there yet. */
function missingColumn(error: { code?: string } | null): boolean {
  return error?.code === "42703" || error?.code === "PGRST204";
}

/** An event in the visitor's language (English falls back to Arabic). */
export function localizeEvent(row: EventRow, locale: Locale): SiteEvent {
  const en = locale === "en";
  return {
    id: row.id,
    title: (en && row.title_en?.trim()) || row.title_ar,
    description: (en && row.description_en?.trim()) || row.description_ar || null,
    location: (en && row.location_en?.trim()) || row.location_ar || null,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    photo: publicImageUrl(row.photo_key),
    pinned: row.pinned === true,
  };
}

/** Pinned events first, then soonest first (0031). */
export function pinnedFirst<T extends { pinned?: boolean; starts_at: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => Number(b.pinned === true) - Number(a.pinned === true) || a.starts_at.localeCompare(b.starts_at),
  );
}

/**
 * Published events that haven't finished yet, soonest first. `missing` =
 * migration 0028 isn't there yet.
 */
export async function getUpcomingEvents(): Promise<{ rows: EventRow[]; missing: boolean }> {
  const supabase = await createClient();
  // An event without an end time stays listed until the end of its day
  // (12 hours after it starts is a fair stand-in).
  const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const query = (columns: string) =>
    supabase
      .from("events")
      .select(columns)
      .eq("published", true)
      .or(`ends_at.gte.${new Date().toISOString()},and(ends_at.is.null,starts_at.gte.${cutoff})`)
      .order("starts_at", { ascending: true })
      .limit(50);
  let { data, error } = await query(COLUMNS);
  if (missingColumn(error)) ({ data, error } = await query(BASE_COLUMNS));
  if (error) {
    if (error.code !== "PGRST205" && error.code !== "42P01") console.error("[events] could not list", error);
    return { rows: [], missing: true };
  }
  return { rows: pinnedFirst((data ?? []) as unknown as EventRow[]), missing: false };
}

/** Every event, drafts and past ones included (head admin; RLS decides). */
export async function getAllEvents(): Promise<{ rows: EventRow[]; missing: boolean }> {
  const supabase = await createClient();
  const query = (columns: string) =>
    supabase.from("events").select(columns).order("starts_at", { ascending: false }).limit(200);
  let { data, error } = await query(COLUMNS);
  if (missingColumn(error)) ({ data, error } = await query(BASE_COLUMNS));
  if (error) return { rows: [], missing: true };
  return { rows: (data ?? []) as unknown as EventRow[], missing: false };
}

// Cairo wall-clock <-> instant conversions: cairoLocalToIso / isoToCairoLocal
// in lib/site-event.ts (shared with the countdown card).
