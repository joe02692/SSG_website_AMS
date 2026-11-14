import "server-only";

import { createClient } from "@/lib/supabase/server";
import { LEADER_COMMITTEES, SCOUT_STAGES } from "@/lib/onboarding";
import type { Profile } from "@/lib/dal";
import { getLeaderDetails } from "@/lib/dal";
import { managedStages } from "@/lib/seasonal-plans";

/**
 * "Paper requests" (migration 0028, table request_items) — item lists like
 * the weekly stage tools (0026), for two new kinds of paper:
 *
 *   committee  One paper per leader committee per week. Any leader in that
 *              committee edits it; every leader sees it. Open Saturday →
 *              Wednesday (Cairo), the same as the stage tools.
 *   event      One paper per stage per event, plus "general". A stage's
 *              paper: that stage's stage admins + the head admin. General:
 *              any leader. Open 10 days before the event until 24 hours
 *              before it.
 *
 * The database enforces the same rules (RLS); this file mirrors them so the
 * page can show who may edit and when.
 */

export const MAX_PAPER_ITEMS = 40;
export const COMMITTEE_CODES = LEADER_COMMITTEES.map((c) => c.value);
export const GENERAL_PAPER = "general";
export const EVENT_PAPER_KEYS = [...SCOUT_STAGES.map((s) => s.value), GENERAL_PAPER];

/** Event papers open this long before the event… */
export const EVENT_OPENS_BEFORE_MS = 10 * 24 * 60 * 60 * 1000;
/** …and close this long before it. */
export const EVENT_CLOSES_BEFORE_MS = 24 * 60 * 60 * 1000;

export type PaperKind = "committee" | "event";

export function isCommitteeCode(value: unknown): value is string {
  return typeof value === "string" && COMMITTEE_CODES.includes(value);
}

export function isEventPaperKey(value: unknown): value is string {
  return typeof value === "string" && EVENT_PAPER_KEYS.includes(value);
}

export type EventWindow = {
  state: "before" | "open" | "closed";
  opensAt: string;
  closesAt: string;
};

export function eventRequestWindow(startsAt: string, now = Date.now()): EventWindow {
  const start = new Date(startsAt).getTime();
  const opens = start - EVENT_OPENS_BEFORE_MS;
  const closes = start - EVENT_CLOSES_BEFORE_MS;
  return {
    state: now < opens ? "before" : now < closes ? "open" : "closed",
    opensAt: new Date(opens).toISOString(),
    closesAt: new Date(closes).toISOString(),
  };
}

export type PaperItem = { id: string; name: string; quantity: number | null };
export type Paper = { items: PaperItem[]; updatedAt: string | null; updatedBy: string | null };

type Row = {
  id: string;
  list_key: string;
  event_id: string | null;
  name: string;
  quantity: number | null;
  updated_at: string;
  editor: { full_name: string | null } | null;
};

const emptyPaper = (): Paper => ({ items: [], updatedAt: null, updatedBy: null });

function addRow(paper: Paper, row: Row) {
  paper.items.push({ id: row.id, name: row.name, quantity: row.quantity });
  if (!paper.updatedAt || row.updated_at > paper.updatedAt) {
    paper.updatedAt = row.updated_at;
    paper.updatedBy = row.editor?.full_name ?? null;
  }
}

/** This week's committee papers by committee code. */
export async function getCommitteePapers(weekStart: string): Promise<{
  byKey: Record<string, Paper>;
  hasLastWeek: Record<string, boolean>;
  missing: boolean;
}> {
  const supabase = await createClient();
  const [current, earlier] = await Promise.all([
    supabase
      .from("request_items")
      .select("id, list_key, event_id, name, quantity, updated_at, editor:updated_by(full_name)")
      .eq("kind", "committee")
      .eq("week_start", weekStart)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("request_items")
      .select("list_key")
      .eq("kind", "committee")
      .lt("week_start", weekStart)
      .limit(2000),
  ]);
  if (current.error) return { byKey: {}, hasLastWeek: {}, missing: true };

  const byKey: Record<string, Paper> = {};
  for (const code of COMMITTEE_CODES) byKey[code] = emptyPaper();
  for (const row of (current.data ?? []) as unknown as Row[]) {
    if (byKey[row.list_key]) addRow(byKey[row.list_key], row);
  }
  const hasLastWeek: Record<string, boolean> = {};
  for (const row of (earlier.data ?? []) as { list_key: string }[]) hasLastWeek[row.list_key] = true;
  return { byKey, hasLastWeek, missing: false };
}

/** Every paper of the given events: eventId → paper key → paper. */
export async function getEventPapers(eventIds: string[]): Promise<Record<string, Record<string, Paper>>> {
  const out: Record<string, Record<string, Paper>> = {};
  for (const id of eventIds) {
    out[id] = {};
    for (const key of EVENT_PAPER_KEYS) out[id][key] = emptyPaper();
  }
  if (eventIds.length === 0) return out;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("request_items")
    .select("id, list_key, event_id, name, quantity, updated_at, editor:updated_by(full_name)")
    .eq("kind", "event")
    .in("event_id", eventIds)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[papers] could not read event papers", error);
    return out;
  }
  for (const row of (data ?? []) as unknown as Row[]) {
    const paper = row.event_id ? out[row.event_id]?.[row.list_key] : undefined;
    if (paper) addRow(paper, row);
  }
  return out;
}

/** The committees the signed-in leader may edit (all of them for the head admin). */
export async function editableCommittees(profile: Profile): Promise<string[]> {
  if (profile.role === "head_site_admin") return COMMITTEE_CODES;
  const details = await getLeaderDetails();
  return (details?.committees ?? []).filter((c) => COMMITTEE_CODES.includes(c));
}

/** The event papers the signed-in leader may edit: own stage(s) + general. */
export async function editableEventPapers(profile: Profile): Promise<string[]> {
  const { codes } = await managedStages(profile);
  return [...codes, GENERAL_PAPER];
}
