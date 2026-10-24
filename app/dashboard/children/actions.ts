"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dal";
import { isParentRole } from "@/lib/roles";
import { HOUR, withinLimits } from "@/lib/rate-limit";
import { missingStorageEnv } from "@/lib/b2";
import { moveToFormerMembers } from "@/lib/storage-paths";
import { getLocale } from "@/lib/i18n/server";
import { localizeState } from "@/lib/i18n/onboarding";

/**
 * A parent's children (migration 0025): linking a scout with their code,
 * removing a child, and — for scouts — making the code.
 *
 * Every action re-checks who is asking; RLS in the database checks it again.
 */

export type ChildActionState = { error?: string; notice?: string; code?: string };

const UUID = /^[0-9a-f-]{36}$/i;

async function linkChild(formData: FormData): Promise<ChildActionState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "You need to be signed in." };
  if (!isParentRole(profile.role)) return { error: "Only parent accounts can link a child." };

  // Codes are short, so guessing has to be slow: 10 tries an hour per parent.
  if (!(await withinLimits([{ name: "link-child", key: profile.id, max: 10, windowSeconds: HOUR }]))) {
    return { error: "Too many tries. Please wait a while and try again." };
  }

  const code = String(formData.get("code") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length !== 8) {
    return { error: "That code isn't valid. Ask your child for a new one — codes work once and last 7 days." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("redeem_guardian_code", { p_code: code });
  if (error) {
    if (error.hint === "NOT_PARENT") return { error: "Only parent accounts can link a child." };
    if (error.hint === "BAD_CODE") {
      return { error: "That code isn't valid. Ask your child for a new one — codes work once and last 7 days." };
    }
    if (error.code === "PGRST202" || error.code === "42883") {
      return { error: "Parent accounts need migration 0025 in Supabase first." };
    }
    console.error("[children] could not redeem a link code", error);
    return { error: `Could not link the child (${error.code ?? "?"}: ${error.message}).` };
  }

  revalidatePath("/dashboard");
  return { notice: "Child linked to your account." };
}

/**
 * Removes a child from this parent's account.
 *   • A scout with their own login (linked): only the link goes.
 *   • A child this parent registered: if another parent also looks after
 *     them, only this link goes; otherwise the child's record is removed and
 *     their certificate moved to Members/Former members/ in Backblaze.
 */
async function removeChild(formData: FormData): Promise<ChildActionState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "You need to be signed in." };
  if (!isParentRole(profile.role)) return { error: "Only parent accounts can link a child." };

  const childId = String(formData.get("childId") ?? "");
  if (!UUID.test(childId)) return { error: "That child isn't linked to your account." };

  const supabase = await createClient();
  const { data } = await supabase
    .from("scout_details")
    .select("id, profile_id, full_name, document_path")
    .eq("id", childId)
    .maybeSingle();
  const child = data as unknown as {
    id: string;
    profile_id: string | null;
    full_name: string | null;
    document_path: string | null;
  } | null;
  if (!child) return { error: "That child isn't linked to your account." };

  // Other parents' links are hidden from this parent, so ask the database.
  const { data: othersCount } = await supabase.rpc("other_guardians", { p_scout: child.id });
  const deleteRecord = child.profile_id === null && Number(othersCount ?? 0) === 0;

  if (deleteRecord) {
    if (missingStorageEnv().length === 0) {
      try {
        await moveToFormerMembers({ key: child.document_path, kind: "scout", fullName: child.full_name });
      } catch (cause) {
        console.error("[children] could not move a removed child's certificate", cause);
        return { error: "Could not remove the child. Please try again." };
      }
    }
    const { error } = await supabase.from("scout_details").delete().eq("id", child.id);
    if (error) {
      console.error("[children] could not delete a child", error);
      return { error: "Could not remove the child. Please try again." };
    }
  } else {
    const { error } = await supabase
      .from("guardianships")
      .delete()
      .eq("guardian_id", profile.id)
      .eq("scout_id", child.id);
    if (error) {
      console.error("[children] could not unlink a child", error);
      return { error: "Could not remove the child. Please try again." };
    }
  }

  revalidatePath("/dashboard");
  return { notice: "Child removed." };
}

/** A scout makes a one-time code for their parent (valid 7 days). */
async function createLinkCode(): Promise<ChildActionState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "You need to be signed in." };
  if (!(await withinLimits([{ name: "link-code", key: profile.id, max: 10, windowSeconds: HOUR }]))) {
    return { error: "Too many tries. Please wait a while and try again." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_guardian_code");
  if (error) {
    if (error.hint === "NO_SCOUT_ROW") return { error: "Fill in your details first, then you can make a code." };
    if (error.code === "PGRST202" || error.code === "42883") {
      return { error: "Parent accounts need migration 0025 in Supabase first." };
    }
    console.error("[children] could not make a link code", error);
    return { error: `Could not make a code (${error.code ?? "?"}: ${error.message}).` };
  }
  return { code: String(data) };
}

export async function linkChildAction(_prev: ChildActionState, formData: FormData) {
  return localizeState(await linkChild(formData), await getLocale());
}

export async function removeChildAction(_prev: ChildActionState, formData: FormData) {
  return localizeState(await removeChild(formData), await getLocale());
}

export async function createLinkCodeAction(_prev: ChildActionState) {
  return localizeState(await createLinkCode(), await getLocale());
}
