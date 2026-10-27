"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dal";
import { getT } from "@/lib/i18n/server";
import { isStageCode, managedStages } from "@/lib/seasonal-plans";
import { MAX_TOOLS_PER_STAGE, toolsWindow } from "@/lib/stage-tools";

/**
 * Changes to a stage's meeting tools (migration 0026). Every action re-checks
 * who is asking and whether the week is open; the database checks both again
 * (RLS on stage_tools), so a crafted request on a Thursday still fails.
 */

export type ToolsState = { error?: string; notice?: string };

const UUID = /^[0-9a-f-]{36}$/i;

/** The member, their stage's id, and this week's Saturday — or an error. */
async function editor(stage: unknown) {
  const t = (await getT()).pages.tools;
  const profile = await getCurrentProfile();
  if (!profile) return { error: t.notAllowed } as const;
  if (!isStageCode(stage)) return { error: t.notAllowed } as const;
  const { codes } = await managedStages(profile);
  if (!codes.includes(stage)) return { error: t.notAllowed } as const;
  const window = toolsWindow();
  if (!window.open) return { error: t.closedError } as const;

  const supabase = await createClient();
  const { data } = await supabase.from("stages").select("id").eq("code", stage).maybeSingle();
  if (!data) return { error: t.notAllowed } as const;
  return { profile, stageId: (data as { id: number }).id, week: window.weekStart, supabase, t } as const;
}

function describe(error: { code?: string; message?: string } | null, fallback: string, t: { missing: string; closedError: string }) {
  if (!error) return fallback;
  if (error.code === "PGRST205" || error.code === "42P01") return t.missing;
  // RLS refused it: almost always the week closing while the page was open.
  if (error.code === "42501") return t.closedError;
  return `${fallback} (${error.code ?? "?"})`;
}

function done(): void {
  revalidatePath("/seasonal-plan");
}

export async function addToolAction(_prev: ToolsState, formData: FormData): Promise<ToolsState> {
  const who = await editor(formData.get("stage"));
  if ("error" in who) return { error: who.error };
  const { supabase, t } = who;

  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const rawQty = String(formData.get("quantity") ?? "")
    .trim()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  if (!name) return { error: t.nameRequired };
  if (name.length > 80) return { error: t.nameTooLong };
  let quantity: number | null = null;
  if (rawQty) {
    quantity = Number(rawQty);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) return { error: t.badQuantity };
  }

  const { data: existing } = await supabase
    .from("stage_tools")
    .select("position")
    .eq("stage_id", who.stageId)
    .eq("week_start", who.week)
    .order("position", { ascending: false })
    .limit(MAX_TOOLS_PER_STAGE + 1);
  const rows = (existing ?? []) as { position: number }[];
  if (rows.length >= MAX_TOOLS_PER_STAGE) return { error: t.tooMany(MAX_TOOLS_PER_STAGE) };

  const { error } = await supabase.from("stage_tools").insert({
    stage_id: who.stageId,
    week_start: who.week,
    name,
    quantity,
    position: (rows[0]?.position ?? -1) + 1,
    created_by: who.profile.id,
    updated_by: who.profile.id,
  });
  if (error) {
    console.error("[tools] could not add", error);
    return { error: describe(error, t.couldNotSave, t) };
  }
  done();
  return { notice: t.added };
}

export async function removeToolAction(_prev: ToolsState, formData: FormData): Promise<ToolsState> {
  const who = await editor(formData.get("stage"));
  if ("error" in who) return { error: who.error };
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { error: who.t.notAllowed };
  const { error } = await who.supabase
    .from("stage_tools")
    .delete()
    .eq("id", id)
    .eq("stage_id", who.stageId)
    .eq("week_start", who.week);
  if (error) {
    console.error("[tools] could not remove", error);
    return { error: describe(error, who.t.couldNotSave, who.t) };
  }
  done();
  return {};
}

/** Moves one item up or down by swapping it with its neighbour. */
export async function moveToolAction(_prev: ToolsState, formData: FormData): Promise<ToolsState> {
  const who = await editor(formData.get("stage"));
  if ("error" in who) return { error: who.error };
  const id = String(formData.get("id") ?? "");
  const direction = formData.get("direction") === "up" ? -1 : 1;
  if (!UUID.test(id)) return { error: who.t.notAllowed };

  const { data } = await who.supabase
    .from("stage_tools")
    .select("id, position")
    .eq("stage_id", who.stageId)
    .eq("week_start", who.week)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  const list = (data ?? []) as { id: string; position: number }[];
  const index = list.findIndex((item) => item.id === id);
  const other = list[index + direction];
  if (index < 0 || !other) return {};

  // Renumber the whole list in its new order, so equal positions (from
  // copying) can never make a move do nothing.
  const order = list.map((item) => item.id);
  [order[index], order[index + direction]] = [order[index + direction], order[index]];
  const results = await Promise.all(
    order.map((itemId, position) =>
      who.supabase
        .from("stage_tools")
        .update({ position, updated_by: who.profile.id })
        .eq("id", itemId),
    ),
  );
  const failed = results.find((r) => r.error)?.error ?? null;
  if (failed) {
    console.error("[tools] could not reorder", failed);
    return { error: describe(failed, who.t.couldNotSave, who.t) };
  }
  done();
  return {};
}

export async function copyLastWeekAction(_prev: ToolsState, formData: FormData): Promise<ToolsState> {
  const who = await editor(formData.get("stage"));
  if ("error" in who) return { error: who.error };
  const { data, error } = await who.supabase.rpc("copy_last_week_tools", { p_stage: who.stageId });
  if (error) {
    if (error.hint === "NOT_EMPTY") return { error: who.t.notEmpty };
    if (error.hint === "CLOSED") return { error: who.t.closedError };
    console.error("[tools] could not copy last week", error);
    return { error: describe(error, who.t.couldNotSave, who.t) };
  }
  done();
  return { notice: Number(data) > 0 ? who.t.copied(Number(data)) : who.t.nothingToCopy };
}
