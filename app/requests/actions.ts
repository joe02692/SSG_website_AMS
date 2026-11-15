"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dal";
import { isStaffRole } from "@/lib/roles";
import { getT } from "@/lib/i18n/server";
import { toolsWindow } from "@/lib/stage-tools";
import {
  MAX_PAPER_ITEMS,
  editableCommittees,
  editableEventPapers,
  eventRequestWindow,
  isCommitteeCode,
  isEventPaperKey,
} from "@/lib/request-papers";
import type { ToolsState } from "@/app/seasonal-plan/tools-actions";

/**
 * Changes to committee and event papers (migration 0028, request_items).
 * Every action re-checks who is asking and whether the paper is open; the
 * database checks both again (RLS), so a crafted request outside the window
 * still fails.
 *
 * Form fields: kind ("committee" | "event"), stage (= the paper key:
 * committee code, stage code or "general"), event (the event id, for event
 * papers), plus the item fields.
 */

const UUID = /^[0-9a-f-]{36}$/i;
const MAX_NOTES = 200;

type Scope = {
  kind: "committee" | "event";
  key: string;
  eventId: string | null;
  week: string | null;
};

async function editor(formData: FormData) {
  const t = (await getT()).features.papers;
  const profile = await getCurrentProfile();
  if (!profile || !isStaffRole(profile.role)) return { error: t.notAllowed } as const;

  const kind = formData.get("kind");
  const key = formData.get("stage");
  const supabase = await createClient();

  if (kind === "committee") {
    if (!isCommitteeCode(key)) return { error: t.notAllowed } as const;
    if (!(await editableCommittees(profile)).includes(key)) return { error: t.notAllowed } as const;
    const window = toolsWindow();
    if (!window.open) return { error: t.weekClosedError } as const;
    const scope: Scope = { kind, key, eventId: null, week: window.weekStart };
    return { profile, supabase, t, scope } as const;
  }

  if (kind === "event") {
    const eventId = String(formData.get("event") ?? "");
    if (!isEventPaperKey(key) || !UUID.test(eventId)) return { error: t.notAllowed } as const;
    if (!(await editableEventPapers(profile)).includes(key)) return { error: t.notAllowed } as const;
    const { data } = await supabase
      .from("events")
      .select("starts_at, published")
      .eq("id", eventId)
      .maybeSingle();
    const event = data as { starts_at: string; published: boolean } | null;
    if (!event || !event.published) return { error: t.notAllowed } as const;
    if (eventRequestWindow(event.starts_at).state !== "open") return { error: t.eventClosedError } as const;
    const scope: Scope = { kind, key, eventId, week: null };
    return { profile, supabase, t, scope } as const;
  }

  return { error: t.notAllowed } as const;
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Column filters that pick out this paper's rows only. */
function paperMatch(scope: Scope): { match: Record<string, string>; nulls: ("event_id" | "week_start")[] } {
  const match: Record<string, string> = { kind: scope.kind, list_key: scope.key };
  const nulls: ("event_id" | "week_start")[] = [];
  if (scope.eventId) match.event_id = scope.eventId;
  else nulls.push("event_id");
  if (scope.week) match.week_start = scope.week;
  else nulls.push("week_start");
  return { match, nulls };
}

function describe(error: { code?: string } | null, fallback: string, t: { missing: string; closedError: string }) {
  if (!error) return fallback;
  if (error.code === "PGRST205" || error.code === "42P01") return t.missing;
  if (error.code === "42501") return t.closedError;
  return `${fallback} (${error.code ?? "?"})`;
}

function done(scope: Scope): void {
  revalidatePath(scope.kind === "committee" ? "/seasonal-plan" : "/events");
}

async function listIds(supabase: Supabase, scope: Scope) {
  const { match, nulls } = paperMatch(scope);
  let query = supabase.from("request_items").select("id, position").match(match);
  for (const column of nulls) query = query.is(column, null);
  const { data } = await query.order("position", { ascending: true }).order("created_at", { ascending: true });
  return (data ?? []) as { id: string; position: number }[];
}

export async function addPaperItemAction(_prev: ToolsState, formData: FormData): Promise<ToolsState> {
  const who = await editor(formData);
  if ("error" in who) return { error: who.error };
  const { supabase, t, scope } = who;

  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const rawQty = String(formData.get("quantity") ?? "")
    .trim()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  const notes = String(formData.get("notes") ?? "").trim().replace(/\s+/g, " ");
  if (!name) return { error: t.nameRequired };
  if (notes.length > MAX_NOTES) return { error: t.notesTooLong(MAX_NOTES) };
  if (name.length > 80) return { error: t.nameTooLong };
  let quantity: number | null = null;
  if (rawQty) {
    quantity = Number(rawQty);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) return { error: t.badQuantity };
  }

  const rows = await listIds(supabase, scope);
  if (rows.length >= MAX_PAPER_ITEMS) return { error: t.tooMany(MAX_PAPER_ITEMS) };
  const last = rows.reduce((max, r) => Math.max(max, r.position), -1);

  const { error } = await supabase.from("request_items").insert({
    kind: scope.kind,
    list_key: scope.key,
    event_id: scope.eventId,
    week_start: scope.week,
    name,
    quantity,
    // Only sent when written, so the add still works before migration 0029.
    ...(notes ? { notes } : {}),
    position: last + 1,
    created_by: who.profile.id,
    updated_by: who.profile.id,
  });
  if (error) {
    console.error("[papers] could not add", error);
    return { error: describe(error, t.couldNotSave, t) };
  }
  done(scope);
  return { notice: t.added };
}

export async function removePaperItemAction(_prev: ToolsState, formData: FormData): Promise<ToolsState> {
  const who = await editor(formData);
  if ("error" in who) return { error: who.error };
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { error: who.t.notAllowed };
  const { match, nulls } = paperMatch(who.scope);
  let query = who.supabase.from("request_items").delete().eq("id", id).match(match);
  for (const column of nulls) query = query.is(column, null);
  const { error } = await query;
  if (error) {
    console.error("[papers] could not remove", error);
    return { error: describe(error, who.t.couldNotSave, who.t) };
  }
  done(who.scope);
  return {};
}

export async function movePaperItemAction(_prev: ToolsState, formData: FormData): Promise<ToolsState> {
  const who = await editor(formData);
  if ("error" in who) return { error: who.error };
  const id = String(formData.get("id") ?? "");
  const direction = formData.get("direction") === "up" ? -1 : 1;
  if (!UUID.test(id)) return { error: who.t.notAllowed };

  const list = await listIds(who.supabase, who.scope);
  const index = list.findIndex((item) => item.id === id);
  if (index < 0 || !list[index + direction]) return {};
  const order = list.map((item) => item.id);
  [order[index], order[index + direction]] = [order[index + direction], order[index]];
  const results = await Promise.all(
    order.map((itemId, position) =>
      who.supabase.from("request_items").update({ position, updated_by: who.profile.id }).eq("id", itemId),
    ),
  );
  const failed = results.find((r) => r.error)?.error ?? null;
  if (failed) {
    console.error("[papers] could not reorder", failed);
    return { error: describe(failed, who.t.couldNotSave, who.t) };
  }
  done(who.scope);
  return {};
}

/** Committee papers only: bring last week's items into an empty paper. */
export async function copyCommitteeWeekAction(_prev: ToolsState, formData: FormData): Promise<ToolsState> {
  const who = await editor(formData);
  if ("error" in who) return { error: who.error };
  if (who.scope.kind !== "committee") return { error: who.t.notAllowed };
  const { data, error } = await who.supabase.rpc("copy_last_week_committee", { p_committee: who.scope.key });
  if (error) {
    if (error.hint === "NOT_EMPTY") return { error: who.t.notEmpty };
    if (error.hint === "CLOSED") return { error: who.t.weekClosedError };
    console.error("[papers] could not copy last week", error);
    return { error: describe(error, who.t.couldNotSave, who.t) };
  }
  done(who.scope);
  return { notice: Number(data) > 0 ? who.t.copied(Number(data)) : who.t.nothingToCopy };
}

/** Writes (or clears) one item's notes — same people and window as the items. */
export async function updatePaperNoteAction(_prev: ToolsState, formData: FormData): Promise<ToolsState> {
  const who = await editor(formData);
  if ("error" in who) return { error: who.error };
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { error: who.t.notAllowed };
  const notes = String(formData.get("notes") ?? "").trim().replace(/\s+/g, " ");
  if (notes.length > MAX_NOTES) return { error: who.t.notesTooLong(MAX_NOTES) };
  const { match, nulls } = paperMatch(who.scope);
  let query = who.supabase
    .from("request_items")
    .update({ notes: notes || null, updated_by: who.profile.id })
    .eq("id", id)
    .match(match);
  for (const column of nulls) query = query.is(column, null);
  const { error } = await query;
  if (error) {
    console.error("[papers] could not save the note", error);
    return { error: describe(error, who.t.couldNotSave, who.t) };
  }
  done(who.scope);
  return {};
}
