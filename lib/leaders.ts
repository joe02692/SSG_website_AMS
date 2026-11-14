import "server-only";

import { createClient } from "@/lib/supabase/server";
import { publicImageUrl } from "@/lib/public-images";
import type { Locale } from "@/lib/i18n/config";

/**
 * Stage pop-up text and public leader profiles (migration 0028).
 *
 * Only leaders who switched "Show my profile" on appear, and only these
 * fields ever leave the database for visitors: name, photo, about, age (not
 * the birth date), university and faculty, graduate or student, the year
 * they joined, the stages they serve and their title there.
 */

export type StageTitle = "leader" | "assistant";

export type PublicLeader = {
  id: string;
  name: string;
  photo: string | null;
  about: string | null;
  age: number | null;
  university: string;
  faculty: string;
  graduate: boolean;
  joinYear: number | null;
  stages: string[];
  titles: { stage: string; title: StageTitle }[];
};

type LeaderRow = {
  id: string;
  full_name: string;
  photo_key: string | null;
  about: string | null;
  age: number | null;
  university: string;
  faculty: string;
  graduate: boolean;
  join_year: number | null;
  stages: string[] | null;
  titles: { stage: string; title: StageTitle }[] | null;
};

export async function getPublicLeaders(): Promise<PublicLeader[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_leaders");
  if (error) {
    if (error.code !== "PGRST202" && error.code !== "42883") console.error("[leaders] could not list", error);
    return [];
  }
  return ((data ?? []) as LeaderRow[])
    .map((row) => ({
      id: row.id,
      name: row.full_name,
      photo: publicImageUrl(row.photo_key),
      about: row.about,
      age: row.age,
      university: row.university,
      faculty: row.faculty,
      graduate: row.graduate,
      joinYear: row.join_year,
      stages: row.stages ?? [],
      titles: row.titles ?? [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** A stage's leaders: the stage leader first, then the assistant, then the rest. */
export function leadersOfStage(leaders: PublicLeader[], stage: string): (PublicLeader & { title: StageTitle | null })[] {
  const rank = { leader: 0, assistant: 1 } as const;
  return leaders
    .filter((l) => l.stages.includes(stage))
    .map((l) => ({ ...l, title: l.titles.find((x) => x.stage === stage)?.title ?? null }))
    .sort((a, b) => (a.title ? rank[a.title] : 2) - (b.title ? rank[b.title] : 2));
}

// --------------------------------------------------------------- stage info

export type StageInfoRow = {
  stage_code: string;
  promise_ar: string | null;
  promise_en: string | null;
  about_ar: string | null;
  about_en: string | null;
  age_group_ar: string | null;
  age_group_en: string | null;
  vision_ar: string | null;
  vision_en: string | null;
  mission_ar: string | null;
  mission_en: string | null;
};

export const STAGE_INFO_FIELDS = ["promise", "about", "age_group", "vision", "mission"] as const;
export type StageInfoField = (typeof STAGE_INFO_FIELDS)[number];

export type StageInfo = Record<StageInfoField, string | null>;

export async function getStageInfoRows(): Promise<Record<string, StageInfoRow>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("stage_info").select("*");
  if (error) return {};
  const out: Record<string, StageInfoRow> = {};
  for (const row of (data ?? []) as StageInfoRow[]) out[row.stage_code] = row;
  return out;
}

/** One stage's text in the visitor's language (English falls back to Arabic). */
export function localizeStageInfo(row: StageInfoRow | undefined, locale: Locale): StageInfo {
  const pick = (field: StageInfoField) => {
    if (!row) return null;
    const ar = row[`${field}_ar`]?.trim() || null;
    const en = row[`${field}_en`]?.trim() || null;
    return locale === "en" ? en ?? ar : ar ?? en;
  };
  return {
    promise: pick("promise"),
    about: pick("about"),
    age_group: pick("age_group"),
    vision: pick("vision"),
    mission: pick("mission"),
  };
}
