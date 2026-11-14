"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/dal";
import { isHeadSiteAdminRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { isStageCode } from "@/lib/seasonal-plans";
import { STAGE_INFO_FIELDS } from "@/lib/leaders";

/**
 * Admin → Stages (migration 0028): the text in each stage's pop-up, freeing a
 * stage leader / assistant seat, and taking a leader's profile off the site.
 * Head site admin only — checked here and again by RLS / the functions.
 */

export type StageAdminState = { notice?: string; error?: string };

const UUID = /^[0-9a-f-]{36}$/i;
const LIMITS: Record<string, number> = { promise: 1000, about: 2000, age_group: 120, vision: 1000, mission: 1000 };

async function headAdmin() {
  const viewer = await getCurrentProfile();
  return viewer && isHeadSiteAdminRole(viewer.role) ? viewer : null;
}

function refresh() {
  revalidatePath("/stages");
  revalidatePath("/admin/stages");
}

export async function saveStageInfoAction(_prev: StageAdminState, formData: FormData): Promise<StageAdminState> {
  const t = (await getT()).features.adminStages;
  const viewer = await headAdmin();
  if (!viewer) return { error: t.notAllowed };
  const stage = String(formData.get("stage") ?? "");
  if (!isStageCode(stage)) return { error: t.notAllowed };

  const row: Record<string, string | null> = { stage_code: stage, updated_by: viewer.id };
  for (const field of STAGE_INFO_FIELDS) {
    for (const lang of ["ar", "en"] as const) {
      const value = String(formData.get(`${field}_${lang}`) ?? "").trim().replace(/\r\n/g, "\n");
      if (value.length > LIMITS[field]) return { error: t.tooLong };
      row[`${field}_${lang}`] = value || null;
    }
  }
  const supabase = await createClient();
  const { error } = await supabase.from("stage_info").upsert(row, { onConflict: "stage_code" });
  if (error) {
    console.error("[stage-info] could not save", error);
    return { error: error.code === "PGRST205" || error.code === "42P01" ? t.missing : t.couldNotSave };
  }
  refresh();
  return { notice: t.saved };
}

export async function freeSeatAction(_prev: StageAdminState, formData: FormData): Promise<StageAdminState> {
  const t = (await getT()).features.adminStages;
  if (!(await headAdmin())) return { error: t.notAllowed };
  const stageId = Number(formData.get("stage_id"));
  const profileId = String(formData.get("profile_id") ?? "");
  if (!Number.isInteger(stageId) || !UUID.test(profileId)) return { error: t.notAllowed };
  const supabase = await createClient();
  const { error } = await supabase.rpc("release_stage_title", { p_stage: stageId, p_profile: profileId });
  if (error) {
    console.error("[stage-info] could not free seat", error);
    return { error: t.couldNotSave };
  }
  refresh();
  revalidatePath(`/leaders/${profileId}`);
  return { notice: t.seatFreed };
}

export async function hideLeaderProfileAction(_prev: StageAdminState, formData: FormData): Promise<StageAdminState> {
  const t = (await getT()).features.adminStages;
  if (!(await headAdmin())) return { error: t.notAllowed };
  const profileId = String(formData.get("profile_id") ?? "");
  if (!UUID.test(profileId)) return { error: t.notAllowed };
  const supabase = await createClient();
  const { error } = await supabase.from("leader_profiles").update({ is_public: false }).eq("profile_id", profileId);
  if (error) {
    console.error("[stage-info] could not hide profile", error);
    return { error: t.couldNotSave };
  }
  refresh();
  revalidatePath(`/leaders/${profileId}`);
  return { notice: t.profileHidden };
}
