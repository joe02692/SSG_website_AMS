import "server-only";

import { createClient } from "@/lib/supabase/server";
import { SCOUT_STAGES } from "@/lib/onboarding";

/**
 * "أدوات كل اجتماع" — the tools each stage needs at its meetings
 * (migration 0026, table stage_tools).
 *
 *   • Every leader sees every stage's list.
 *   • Only that stage's stage admins (and the head site admin) change it.
 *   • Open Saturday 12:01 am → Wednesday 11:59 pm, Cairo time; read-only on
 *     Thursday and Friday.
 *   • A fresh list every Saturday (each week is its own list); last week's
 *     can be copied in.
 *
 * The same rules live in the database (stage_tools_open(),
 * current_tools_week()); this file mirrors them so the page can say whether
 * it's open and when that changes.
 */

export const TOOLS_TIMEZONE = "Africa/Cairo";
export const MAX_TOOLS_PER_STAGE = 40;

/** Cairo's calendar date and weekday (0 = Sunday … 6 = Saturday) right now. */
function cairoToday(now = new Date()): { y: number; m: number; d: number; dow: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TOOLS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { y: Number(get("year")), m: Number(get("month")), d: Number(get("day")), dow };
}

function isoDate(y: number, m: number, d: number): string {
  return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
}

export type ToolsWindow = {
  /** Can the lists be changed right now (Saturday → Wednesday, Cairo)? */
  open: boolean;
  /** The Saturday that starts this week's list, "YYYY-MM-DD". */
  weekStart: string;
  /** The Wednesday editing closes on, "YYYY-MM-DD". */
  closesOn: string;
  /** The next Saturday, when a fresh list starts, "YYYY-MM-DD". */
  nextWeek: string;
};

export function toolsWindow(now = new Date()): ToolsWindow {
  const { y, m, d, dow } = cairoToday(now);
  const back = (dow + 1) % 7; // days since Saturday
  const saturday = new Date(Date.UTC(y, m - 1, d - back));
  const plus = (days: number) =>
    isoDate(saturday.getUTCFullYear(), saturday.getUTCMonth() + 1, saturday.getUTCDate() + days);
  return {
    open: [6, 0, 1, 2, 3].includes(dow),
    weekStart: plus(0),
    closesOn: plus(4),
    nextWeek: plus(7),
  };
}

export type ToolItem = { id: string; name: string; quantity: number | null; position: number };

export type StageTools = {
  items: ToolItem[];
  updatedAt: string | null;
  updatedBy: string | null;
};

type Row = {
  id: string;
  name: string;
  quantity: number | null;
  position: number;
  updated_at: string;
  stages: { code: string } | null;
  editor: { full_name: string | null } | null;
};

/**
 * This week's lists, by stage code. `missing` = migration 0026 isn't there
 * yet (the page then shows a note instead of the section's content).
 */
export async function getWeekTools(weekStart: string): Promise<{
  byStage: Record<string, StageTools>;
  hasLastWeek: Record<string, boolean>;
  missing: boolean;
}> {
  const supabase = await createClient();
  const [current, earlier] = await Promise.all([
    supabase
      .from("stage_tools")
      .select("id, name, quantity, position, updated_at, stages(code), editor:updated_by(full_name)")
      .eq("week_start", weekStart)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    // Which stages have an earlier list to copy from.
    supabase
      .from("stage_tools")
      .select("stages(code)")
      .lt("week_start", weekStart)
      .limit(2000),
  ]);

  if (current.error) return { byStage: {}, hasLastWeek: {}, missing: true };

  const byStage: Record<string, StageTools> = {};
  for (const stage of SCOUT_STAGES) byStage[stage.value] = { items: [], updatedAt: null, updatedBy: null };

  for (const row of (current.data ?? []) as unknown as Row[]) {
    const code = row.stages?.code;
    if (!code || !byStage[code]) continue;
    const list = byStage[code];
    list.items.push({ id: row.id, name: row.name, quantity: row.quantity, position: row.position });
    if (!list.updatedAt || row.updated_at > list.updatedAt) {
      list.updatedAt = row.updated_at;
      list.updatedBy = row.editor?.full_name ?? null;
    }
  }

  const hasLastWeek: Record<string, boolean> = {};
  for (const row of (earlier.data ?? []) as unknown as { stages: { code: string } | null }[]) {
    if (row.stages?.code) hasLastWeek[row.stages.code] = true;
  }

  return { byStage, hasLastWeek, missing: false };
}
