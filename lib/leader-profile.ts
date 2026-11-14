import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/dal";
import { getLeaderDetails } from "@/lib/dal";
import { publicImageUrl } from "@/lib/public-images";

/** The signed-in leader's own public profile, for the dashboard form (0028). */

export type ServedStage = { id: number; code: string };

/** The stages a leader serves: those picked at registration, plus a stage admin's own stage. */
export async function servedStages(profile: Profile): Promise<ServedStage[]> {
  const supabase = await createClient();
  const details = await getLeaderDetails();
  const codes = new Set(details?.committee_codes ?? []);
  if (profile.role === "stage_admin") {
    const { data } = await supabase
      .from("profiles")
      .select("stages:admin_stage_id(code)")
      .eq("id", profile.id)
      .maybeSingle();
    const code = (data as { stages: { code: string } | null } | null)?.stages?.code;
    if (code) codes.add(code);
  }
  if (codes.size === 0) return [];
  const { data } = await supabase.from("stages").select("id, code, sort").in("code", [...codes]).order("sort");
  return ((data ?? []) as { id: number; code: string }[]).map(({ id, code }) => ({ id, code }));
}

export type OwnLeaderProfile = {
  missing: boolean;
  photo: string | null;
  about: string;
  isPublic: boolean;
  stages: {
    code: string;
    mine: "leader" | "assistant" | "";
    /** Who holds each seat, if someone else does. */
    leaderTakenBy: string | null;
    assistantTakenBy: string | null;
  }[];
};

export async function getOwnLeaderProfile(profile: Profile): Promise<OwnLeaderProfile> {
  const supabase = await createClient();
  const [row, holders, stages] = await Promise.all([
    supabase.from("leader_profiles").select("photo_key, about, is_public").eq("profile_id", profile.id).maybeSingle(),
    supabase.rpc("stage_title_holders"),
    servedStages(profile),
  ]);
  if (row.error) {
    return { missing: true, photo: null, about: "", isPublic: false, stages: [] };
  }
  const data = row.data as { photo_key: string | null; about: string | null; is_public: boolean } | null;
  const seats = (holders.data ?? []) as { stage_code: string; title: string; profile_id: string; full_name: string | null }[];
  const seat = (code: string, title: string) => seats.find((s) => s.stage_code === code && s.title === title);

  return {
    missing: false,
    photo: publicImageUrl(data?.photo_key),
    about: data?.about ?? "",
    isPublic: data?.is_public ?? false,
    stages: stages.map(({ code }) => {
      const leader = seat(code, "leader");
      const assistant = seat(code, "assistant");
      return {
        code,
        mine: leader?.profile_id === profile.id ? "leader" : assistant?.profile_id === profile.id ? "assistant" : "",
        leaderTakenBy: leader && leader.profile_id !== profile.id ? leader.full_name ?? "—" : null,
        assistantTakenBy: assistant && assistant.profile_id !== profile.id ? assistant.full_name ?? "—" : null,
      };
    }),
  };
}
