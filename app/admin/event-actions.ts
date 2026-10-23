"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getCurrentProfile } from "@/lib/dal";
import { isHeadSiteAdminRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { SITE_EVENT_TAG, cairoLocalToIso } from "@/lib/site-event";

export type EventFormState = {
  notice?: string;
  error?: string;
  /** Which field the error belongs to, so the form can mark it. */
  field?: "title_ar" | "starts_at";
};

const LIMITS = { title: 80, description: 200 } as const;

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Saves the event countdown. Head site admin only.
 *
 * Checked twice, on purpose: here (so anyone else gets a clear message) and in
 * the database, where the RLS policy from migration 0023 refuses an update
 * from anyone but the head site admin even if this check were wrong.
 */
export async function saveEventAction(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const t = (await getT()).members.event;

  const viewer = await getCurrentProfile();
  if (!viewer || !isHeadSiteAdminRole(viewer.role)) return { error: t.notAllowed };

  const enabled = formData.get("enabled") === "on";
  const titleAr = text(formData, "title_ar");
  const titleEn = text(formData, "title_en");
  const descriptionAr = text(formData, "description_ar");
  const descriptionEn = text(formData, "description_en");
  const startsLocal = text(formData, "starts_at");

  if (
    titleAr.length > LIMITS.title ||
    titleEn.length > LIMITS.title ||
    descriptionAr.length > LIMITS.description ||
    descriptionEn.length > LIMITS.description
  ) {
    return { error: t.tooLong };
  }

  let startsAt: string | null = null;
  if (startsLocal) {
    startsAt = cairoLocalToIso(startsLocal);
    if (!startsAt) return { error: t.badDate, field: "starts_at" };
  }

  // Switching it on needs everything a visitor will see. Switching it off
  // saves whatever is typed, so a draft can be prepared in advance.
  if (enabled) {
    if (!titleAr) return { error: t.needTitle, field: "title_ar" };
    if (!startsAt) return { error: t.needDate, field: "starts_at" };
    if (new Date(startsAt).getTime() <= Date.now()) return { error: t.pastDate, field: "starts_at" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_event")
    .update({
      enabled,
      title_ar: titleAr,
      title_en: titleEn,
      description_ar: descriptionAr,
      description_en: descriptionEn,
      starts_at: startsAt,
      updated_at: new Date().toISOString(),
      updated_by: viewer.id,
    })
    .eq("id", 1)
    .select("id");

  if (error) {
    // 42P01 / PGRST205: the table doesn't exist — migration 0023 not run.
    if (error.code === "42P01" || error.code === "PGRST205") return { error: t.migrationMissing };
    console.error("[admin] could not save the event countdown", error);
    return { error: t.couldNotSave };
  }
  // No row updated: the one row is missing (0023 half-run) or RLS refused it.
  if (!data || data.length === 0) return { error: t.migrationMissing };

  // Every public page shows the countdown: drop the cached copy now.
  updateTag(SITE_EVENT_TAG);
  revalidatePath("/admin");
  return { notice: t.saved };
}
