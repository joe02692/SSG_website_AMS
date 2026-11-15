"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dal";
import { isStaffRole } from "@/lib/roles";
import { getT } from "@/lib/i18n/server";
import { canSetItemSource } from "@/lib/request-papers";
import { ITEM_SOURCES, type ItemSource } from "@/lib/stage-tools";
import type { ToolsState } from "@/app/seasonal-plan/tools-actions";

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Sets where one item comes from — مخزن (store), قاعة (hall) or مشتريات
 * (purchase), or clears it (migration 0029). The Tools & logistics committee
 * and the head site admin only, on any paper, at any time (also after the
 * paper has closed). The database checks the same through set_item_source().
 *
 * Form fields: list ("stage_tools" | "request_items"), id, source ("" clears).
 */
export async function setItemSourceAction(_prev: ToolsState, formData: FormData): Promise<ToolsState> {
  const t = (await getT()).pages.tools;
  const profile = await getCurrentProfile();
  if (!profile || !isStaffRole(profile.role) || !(await canSetItemSource(profile))) {
    return { error: t.sourceNotAllowed };
  }
  const list = formData.get("list");
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("source") ?? "");
  if ((list !== "stage_tools" && list !== "request_items") || !UUID.test(id)) return { error: t.sourceNotAllowed };
  if (raw && !ITEM_SOURCES.includes(raw as ItemSource)) return { error: t.couldNotSave };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_item_source", { p_list: list, p_id: id, p_source: raw || null });
  if (error) {
    if (error.hint === "NOT_ALLOWED") return { error: t.sourceNotAllowed };
    if (error.code === "PGRST202" || error.code === "42883") return { error: t.needs0029 };
    console.error("[papers] could not set the source", error);
    return { error: t.couldNotSave };
  }
  revalidatePath(list === "stage_tools" ? "/seasonal-plan" : "/events");
  if (list === "request_items") revalidatePath("/seasonal-plan");
  return {};
}
