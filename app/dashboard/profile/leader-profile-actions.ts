"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dal";
import { isStaffRole } from "@/lib/roles";
import { getT } from "@/lib/i18n/server";
import { deletePublicImage, storePublicImage } from "@/lib/public-images";
import { servedStages } from "@/lib/leader-profile";

/**
 * Saves a leader's public profile (migration 0028): photo, about, the
 * "show my profile" switch, and his title in each stage he serves (one
 * stage leader and one assistant per stage — first come, first served).
 */

export type LeaderProfileState = { notice?: string; error?: string; field?: "photo" | "about" | "titles" };

const MAX_ABOUT = 800;

export async function saveLeaderProfileAction(
  _prev: LeaderProfileState,
  formData: FormData,
): Promise<LeaderProfileState> {
  const t = (await getT()).features.leaderForm;
  const profile = await getCurrentProfile();
  if (!profile || !isStaffRole(profile.role)) return { error: t.notAllowed };

  const about = String(formData.get("about") ?? "").trim().replace(/\r\n/g, "\n");
  if (about.length > MAX_ABOUT) return { error: t.aboutTooLong(MAX_ABOUT), field: "about" };

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("leader_profiles")
    .select("photo_key")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (readError) {
    if (readError.code === "PGRST205" || readError.code === "42P01") return { error: t.missing };
    return { error: t.couldNotSave };
  }
  const oldPhoto = (current as { photo_key: string | null } | null)?.photo_key ?? null;

  let photoKey = oldPhoto;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const stored = await storePublicImage(photo, "leaders");
    if ("error" in stored) {
      return {
        error: stored.error === "too-big" ? t.photoTooBig : stored.error === "not-image" ? t.photoNotImage : t.couldNotSave,
        field: "photo",
      };
    }
    photoKey = stored.key;
  } else if (formData.get("remove_photo") === "on") {
    photoKey = null;
  }

  const { error } = await supabase.from("leader_profiles").upsert(
    {
      profile_id: profile.id,
      photo_key: photoKey,
      about: about || null,
      is_public: formData.get("is_public") === "on",
    },
    { onConflict: "profile_id" },
  );
  if (error) {
    console.error("[leader-profile] could not save", error);
    if (photoKey && photoKey !== oldPhoto) await deletePublicImage(photoKey);
    return { error: t.couldNotSave };
  }
  if (oldPhoto && oldPhoto !== photoKey) await deletePublicImage(oldPhoto);

  // Titles: one choice per stage he serves ("" = none).
  const stages = await servedStages(profile);
  const { data: held } = await supabase
    .from("stage_titles")
    .select("stage_id, title")
    .eq("profile_id", profile.id);
  const mine = new Map(((held ?? []) as { stage_id: number; title: string }[]).map((r) => [r.stage_id, r.title]));

  const taken: string[] = [];
  for (const stage of stages) {
    const wanted = String(formData.get(`title_${stage.code}`) ?? "");
    const now = mine.get(stage.id) ?? "";
    if (wanted === now) continue;
    if (wanted === "") {
      const { error: releaseError } = await supabase.rpc("release_stage_title", { p_stage: stage.id });
      if (releaseError) console.error("[leader-profile] could not release", releaseError);
    } else if (wanted === "leader" || wanted === "assistant") {
      const { error: claimError } = await supabase.rpc("claim_stage_title", { p_stage: stage.id, p_title: wanted });
      if (claimError) {
        if (claimError.hint === "TAKEN") taken.push(stage.code);
        else console.error("[leader-profile] could not claim", claimError);
      }
    }
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/stages");
  revalidatePath(`/leaders/${profile.id}`);
  if (taken.length > 0) return { error: t.titleTaken, field: "titles" };
  return { notice: t.saved };
}
