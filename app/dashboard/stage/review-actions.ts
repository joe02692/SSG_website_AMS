"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dal";
import { getT } from "@/lib/i18n/server";

/**
 * Approves or rejects a scout's registration (migration 0029). The head site
 * admin reviews any scout; a stage admin reviews scouts of his own stage.
 * review_scout() in the database checks exactly that again.
 */

export type ReviewState = { error?: string; notice?: string };

const UUID = /^[0-9a-f-]{36}$/i;

export async function reviewScoutAction(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const t = (await getT()).features.scoutApproval;
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "head_site_admin" && profile.role !== "stage_admin")) {
    return { error: t.notAllowed };
  }
  const id = String(formData.get("id") ?? "");
  const decision = formData.get("decision");
  if (!UUID.test(id) || (decision !== "approved" && decision !== "rejected")) return { error: t.notAllowed };

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_scout", { p_scout: id, p_decision: decision });
  if (error) {
    if (error.hint === "NOT_ALLOWED") return { error: t.notAllowed };
    if (error.hint === "NOT_FOUND") return { error: t.gone };
    console.error("[scouts] could not review", error);
    return { error: t.couldNotSave };
  }
  revalidatePath("/dashboard/stage");
  revalidatePath("/admin");
  return { notice: decision === "approved" ? t.approved : t.rejected };
}
