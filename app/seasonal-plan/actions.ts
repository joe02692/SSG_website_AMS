"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/dal";
import { isStaffRole } from "@/lib/roles";
import {
  deleteAllVersions,
  getObjectBytes,
  missingStorageEnv,
  presignDownload,
  presignUpload,
  putObject,
} from "@/lib/b2";
import { incomingPrefix } from "@/lib/storage-paths";
import {
  clearPlanFolder,
  isRealExcel,
  isStageCode,
  listPlans,
  managedStages,
  planKey,
} from "@/lib/seasonal-plans";
import { MAX_PLAN_BYTES, PLAN_TYPES, planExtension } from "@/lib/seasonal-plan-rules";
import { SCOUT_STAGES } from "@/lib/onboarding";
import { getT } from "@/lib/i18n/server";

/**
 * Seasonal plan uploads, downloads and deletes.
 *
 * Every action re-checks who is asking: Server Actions can be POSTed to
 * directly, so the page hiding a button is not a guard. Backblaze knows
 * nothing about our users — these checks are the whole of the security.
 *
 * Upload is two steps, like the members' documents: the browser PUTs the file
 * to a short-lived URL under `_incoming/<their id>/`, then savePlanAction reads
 * it back, proves it is a real Excel workbook, and files it in the stage's
 * folder. A file only reaches leaders after that check.
 */

export type PlanUploadTicket = { url?: string; key?: string; contentType?: string; error?: string };
export type PlanResult = { notice?: string; error?: string };
export type PlanLink = { url?: string; error?: string };

async function t() {
  return (await getT()).pages.seasonal;
}

/** The signed-in member, if they may change this stage's plan. */
async function managerFor(stage: unknown) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: (await t()).signInFirst } as const;
  if (!isStageCode(stage)) return { error: (await t()).notAllowed } as const;
  const { codes } = await managedStages(profile);
  if (!codes.includes(stage)) return { error: (await t()).notAllowed } as const;
  return { profile, stage } as const;
}

function storageMissing(): boolean {
  return missingStorageEnv().length > 0;
}

/** Step 1: a one-off URL the browser can upload one Excel file to. */
export async function createPlanUploadAction(formData: FormData): Promise<PlanUploadTicket> {
  const words = await t();
  const who = await managerFor(formData.get("stage"));
  if ("error" in who) return { error: who.error };

  const name = String(formData.get("fileName") ?? "");
  const size = Number(formData.get("size") ?? 0);
  const ext = planExtension(name);
  if (!ext) return { error: words.wrongType };
  if (!Number.isFinite(size) || size <= 0 || size > MAX_PLAN_BYTES) return { error: words.tooBig };
  if (storageMissing()) return { error: words.storageMissing };

  // Built from the session, never from the form: nobody can aim an upload at
  // another member's folder or straight at a stage folder.
  const key = `${incomingPrefix(who.profile.id)}seasonal-${randomUUID()}.${ext}`;
  try {
    const url = await presignUpload(key, PLAN_TYPES[ext]);
    return { url, key, contentType: PLAN_TYPES[ext] };
  } catch (error) {
    console.error("[seasonal-plan] could not sign an upload URL", error);
    return { error: words.uploadFailed };
  }
}

/** Step 2: check the uploaded file and make it the stage's plan. */
export async function savePlanAction(formData: FormData): Promise<PlanResult> {
  const words = await t();
  const who = await managerFor(formData.get("stage"));
  if ("error" in who) return { error: who.error };

  const key = String(formData.get("key") ?? "");
  const originalName = String(formData.get("fileName") ?? "").slice(0, 200);
  const ext = planExtension(key);
  // Only this member's own fresh upload, of an Excel type, may be filed.
  if (!ext || !key.startsWith(`${incomingPrefix(who.profile.id)}seasonal-`) || planExtension(originalName) !== ext) {
    return { error: words.notAllowed };
  }

  const bytes = await getObjectBytes(key);
  if (!bytes) return { error: words.uploadFailed };
  if (bytes.byteLength > MAX_PLAN_BYTES) {
    await deleteAllVersions(key);
    return { error: words.tooBig };
  }
  if (!isRealExcel(ext, bytes)) {
    await deleteAllVersions(key);
    return { error: words.notExcel };
  }

  const target = planKey(who.stage, ext);
  try {
    await putObject(target, bytes, PLAN_TYPES[ext], {
      "uploaded-by": encodeURIComponent(who.profile.full_name ?? ""),
      "original-name": encodeURIComponent(originalName),
    });
    // One file per stage: the old plan (any extension, any older version) goes
    // for good, and so does the temporary upload.
    await clearPlanFolder(who.stage, target);
    await deleteAllVersions(key);
  } catch (error) {
    console.error("[seasonal-plan] could not file the plan", error);
    return { error: words.couldNotSave };
  }

  revalidatePath("/seasonal-plan");
  return { notice: words.saved };
}

/** Deletes a stage's plan, for good. */
export async function deletePlanAction(formData: FormData): Promise<PlanResult> {
  const words = await t();
  const who = await managerFor(formData.get("stage"));
  if ("error" in who) return { error: who.error };
  if (storageMissing()) return { error: words.storageMissing };
  try {
    await clearPlanFolder(who.stage);
  } catch (error) {
    console.error("[seasonal-plan] could not delete the plan", error);
    return { error: words.couldNotDelete };
  }
  revalidatePath("/seasonal-plan");
  return { notice: words.deleted };
}

/** A one-minute download link for a stage's plan. Any leader may ask. */
export async function planDownloadAction(formData: FormData): Promise<PlanLink> {
  const words = await t();
  const profile = await getCurrentProfile();
  if (!profile) return { error: words.signInFirst };
  if (!isStaffRole(profile.role)) return { error: words.notAllowed };
  const stage = formData.get("stage");
  if (!isStageCode(stage)) return { error: words.notAllowed };
  if (storageMissing()) return { error: words.storageMissing };

  try {
    const plan = (await listPlans())[stage];
    if (!plan) return { error: words.couldNotOpen };
    const label = SCOUT_STAGES.find((s) => s.value === stage)?.label ?? stage;
    const name = plan.originalName && planExtension(plan.originalName) ? plan.originalName : `${label} seasonal plan.${plan.ext}`;
    return { url: await presignDownload(plan.key, name) };
  } catch (error) {
    console.error("[seasonal-plan] could not sign a download URL", error);
    return { error: words.couldNotOpen };
  }
}
