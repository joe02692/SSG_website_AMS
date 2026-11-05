"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/dal";
import { isHeadSiteAdminRole, isStaffRole } from "@/lib/roles";
import {
  deleteAllVersions,
  getObjectBytes,
  missingStorageEnv,
  objectMetadata,
  objectSize,
  presignDownload,
  presignUpload,
  putObject,
} from "@/lib/b2";
import { incomingPrefix } from "@/lib/storage-paths";
import {
  MAX_PLANS_PER_STAGE,
  archiveFolder,
  archivePlanFile,
  findPlan,
  isRealExcel,
  isStageCode,
  listPlans,
  managedStages,
  newPlanKey,
} from "@/lib/seasonal-plans";
import { MAX_EDITS_PER_SAVE, applyPlanEdits, isCellAddress, type CellEdit } from "@/lib/plan-edit";
import { MAX_PLAN_BYTES, PLAN_TYPES, planExtension } from "@/lib/seasonal-plan-rules";
import { getT } from "@/lib/i18n/server";

/**
 * Seasonal plan uploads, downloads, edits and removals.
 *
 * Every action re-checks who is asking: Server Actions can be POSTed to
 * directly, so the page hiding a button is not a guard. Backblaze knows
 * nothing about our users — these checks are the whole of the security.
 *
 *   • add / replace / archive a file — that stage's stage admins + the head
 *     site admin (managedStages)
 *   • edit cells, open, download — every leader (isStaffRole)
 *   • delete for good — the head site admin only
 *
 * Upload is two steps, like the members' documents: the browser PUTs the file
 * to a short-lived URL under `_System/Incoming/<their id>/`, then
 * savePlanAction reads it back, proves it is a real Excel workbook, and files
 * it in the stage's folder. A file only reaches leaders after that check.
 *
 * A stage holds up to MAX_PLANS_PER_STAGE files. "Add" refuses a 4th; a
 * "Replace" names the file it replaces, which goes to the archive.
 */

export type PlanUploadTicket = { url?: string; key?: string; contentType?: string; error?: string };
export type PlanResult = { notice?: string; error?: string };
export type PlanLink = { url?: string; error?: string };
export type EditSaveResult = { notice?: string; error?: string; fileName?: string };

async function t() {
  return (await getT()).pages.seasonal;
}

/** The signed-in member, if they may change this stage's files. */
async function managerFor(stage: unknown) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: (await t()).signInFirst } as const;
  if (!isStageCode(stage)) return { error: (await t()).notAllowed } as const;
  const { codes } = await managedStages(profile);
  if (!codes.includes(stage)) return { error: (await t()).notAllowed } as const;
  return { profile, stage } as const;
}

/** The signed-in leader (any staff role), or an error. */
async function leader() {
  const profile = await getCurrentProfile();
  if (!profile) return { error: (await t()).signInFirst } as const;
  if (!isStaffRole(profile.role)) return { error: (await t()).notAllowed } as const;
  return { profile } as const;
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
  const replace = String(formData.get("replace") ?? "");
  const ext = planExtension(name);
  if (!ext) return { error: words.wrongType };
  if (!Number.isFinite(size) || size <= 0 || size > MAX_PLAN_BYTES) return { error: words.tooBig };
  if (storageMissing()) return { error: words.storageMissing };

  // Say "full" before the upload, not after it.
  if (!replace) {
    const count = ((await listPlans())[who.stage] ?? []).length;
    if (count >= MAX_PLANS_PER_STAGE) return { error: words.tooManyFiles(MAX_PLANS_PER_STAGE) };
  }

  const key = `${incomingPrefix(who.profile.id)}seasonal-${randomUUID()}.${ext}`;
  try {
    const url = await presignUpload(key, PLAN_TYPES[ext]);
    return { url, key, contentType: PLAN_TYPES[ext] };
  } catch (error) {
    console.error("[seasonal-plan] could not sign an upload URL", error);
    return { error: words.uploadFailed };
  }
}

/**
 * Step 2: check the uploaded file and file it — as a new file (up to three per
 * stage), or in place of the file named in `replace` (that one is archived).
 */
export async function savePlanAction(formData: FormData): Promise<PlanResult> {
  const words = await t();
  const who = await managerFor(formData.get("stage"));
  if ("error" in who) return { error: who.error };

  const key = String(formData.get("key") ?? "");
  const originalName = String(formData.get("fileName") ?? "").slice(0, 200);
  const replaceName = String(formData.get("replace") ?? "");
  const ext = planExtension(key);
  if (!ext || !key.startsWith(`${incomingPrefix(who.profile.id)}seasonal-`) || planExtension(originalName) !== ext) {
    return { error: words.notAllowed };
  }

  const size = await objectSize(key);
  if (size === null) return { error: words.uploadFailed };
  if (size > MAX_PLAN_BYTES) {
    await deleteAllVersions(key, undefined, true);
    return { error: words.tooBig };
  }
  const bytes = await getObjectBytes(key, MAX_PLAN_BYTES);
  if (!bytes) return { error: words.uploadFailed };
  if (!isRealExcel(ext, bytes)) {
    await deleteAllVersions(key, undefined, true);
    return { error: words.notExcel };
  }

  try {
    const current = (await listPlans())[who.stage] ?? [];
    const replacing = replaceName ? current.find((p) => p.fileName === replaceName) : undefined;
    if (replaceName && !replacing) {
      await deleteAllVersions(key, undefined, true);
      return { error: words.fileGone };
    }
    if (!replacing && current.length >= MAX_PLANS_PER_STAGE) {
      await deleteAllVersions(key, undefined, true);
      return { error: words.tooManyFiles(MAX_PLANS_PER_STAGE) };
    }
    if (replacing) await archivePlanFile(who.stage, replacing.key);
    const target = await newPlanKey(who.stage, originalName, ext);
    await putObject(target, bytes, PLAN_TYPES[ext], {
      "uploaded-by": encodeURIComponent(who.profile.full_name ?? ""),
      "original-name": encodeURIComponent(originalName),
    });
    await deleteAllVersions(key, undefined, true);
  } catch (error) {
    console.error("[seasonal-plan] could not file the plan", error);
    return { error: words.couldNotSave };
  }

  revalidatePath("/seasonal-plan");
  return { notice: replaceName ? words.replaced : words.saved };
}

/** Takes one file down — into the Archive, never deleted. */
export async function deletePlanAction(formData: FormData): Promise<PlanResult> {
  const words = await t();
  const who = await managerFor(formData.get("stage"));
  if ("error" in who) return { error: who.error };
  if (storageMissing()) return { error: words.storageMissing };
  try {
    const plan = await findPlan(who.stage, formData.get("file"));
    if (!plan) return { error: words.fileGone };
    await archivePlanFile(who.stage, plan.key);
  } catch (error) {
    console.error("[seasonal-plan] could not archive the plan", error);
    return { error: words.couldNotDelete };
  }
  revalidatePath("/seasonal-plan");
  return { notice: words.deleted };
}

/** A one-minute download link for one of a stage's files. Any leader may ask. */
export async function planDownloadAction(formData: FormData): Promise<PlanLink> {
  const words = await t();
  const who = await leader();
  if ("error" in who) return { error: who.error };
  const stage = formData.get("stage");
  if (!isStageCode(stage)) return { error: words.notAllowed };
  if (storageMissing()) return { error: words.storageMissing };

  try {
    const plan = await findPlan(stage, formData.get("file"));
    if (!plan) return { error: words.couldNotOpen };
    const name = plan.originalName && planExtension(plan.originalName) === plan.ext ? plan.originalName : plan.fileName;
    return { url: await presignDownload(plan.key, name) };
  } catch (error) {
    console.error("[seasonal-plan] could not sign a download URL", error);
    return { error: words.couldNotOpen };
  }
}

/** A one-minute download link for an archived plan. Any leader may ask. */
export async function archiveDownloadAction(formData: FormData): Promise<PlanLink> {
  const words = await t();
  const who = await leader();
  if ("error" in who) return { error: who.error };
  const stage = formData.get("stage");
  const key = String(formData.get("key") ?? "");
  if (!isStageCode(stage) || !key.startsWith(archiveFolder(stage)) || key.includes("..") || !planExtension(key)) {
    return { error: words.notAllowed };
  }
  if (storageMissing()) return { error: words.storageMissing };
  try {
    return { url: await presignDownload(key, key.slice(archiveFolder(stage).length)) };
  } catch (error) {
    console.error("[seasonal-plan] could not sign an archive download URL", error);
    return { error: words.couldNotOpen };
  }
}

/**
 * Saves cell edits made on the page. Every leader may edit every stage's
 * files (Zyad, 5 Nov 2026).
 *
 * The edits are applied to the file as it is now (not as it was when the page
 * opened), so different leaders' changes to different cells all survive.
 * Only the edited cells change inside the file (lib/plan-edit.ts), so an
 * .xlsx or .xlsm keeps everything else — checkboxes, styles, macros — and is
 * saved in place (Backblaze keeps the previous version). The old binary .xls
 * format can't be edited in place: the original goes to the archive and the
 * edited copy is saved as .xlsx beside it.
 */
export async function savePlanEditsAction(input: {
  stage: string;
  file: string;
  sheet: string;
  edits: CellEdit[];
}): Promise<EditSaveResult> {
  const words = await t();
  const who = await leader();
  if ("error" in who) return { error: who.error };
  if (!isStageCode(input?.stage) || typeof input.sheet !== "string" || !input.sheet) return { error: words.notAllowed };
  if (!Array.isArray(input.edits) || input.edits.length === 0) return { notice: words.noChanges };
  if (input.edits.length > MAX_EDITS_PER_SAVE) return { error: words.tooManyEdits(MAX_EDITS_PER_SAVE) };
  const edits = input.edits.filter(
    (e): e is CellEdit => isCellAddress(e?.address) && typeof e?.value === "string",
  );
  if (edits.length !== input.edits.length) return { error: words.notAllowed };
  if (storageMissing()) return { error: words.storageMissing };

  try {
    const plan = await findPlan(input.stage, input.file);
    if (!plan) return { error: words.fileGone };
    const bytes = await getObjectBytes(plan.key, MAX_PLAN_BYTES);
    if (!bytes) return { error: words.couldNotOpen };

    const result = await applyPlanEdits(bytes, plan.ext, input.sheet, edits);
    if (result.bytes.byteLength > MAX_PLAN_BYTES) return { error: words.tooBig };

    const meta = (await objectMetadata(plan.key)) ?? {};
    const editedBy = encodeURIComponent(who.profile.full_name ?? "");
    let fileName = plan.fileName;
    if (plan.ext !== "xls") {
      // .xlsx / .xlsm are edited in place (macros, checkboxes and styles
      // untouched). Backblaze keeps the previous version.
      await putObject(plan.key, result.bytes, PLAN_TYPES[plan.ext], { ...meta, "edited-by": editedBy });
    } else {
      // The old .xls format → .xlsx: archive the original, save the edited copy.
      const original = meta["original-name"] ? decodeURIComponent(meta["original-name"]) : plan.fileName;
      const asXlsx = original.replace(/\.[^.]+$/, "") + ".xlsx";
      await archivePlanFile(input.stage, plan.key);
      const target = await newPlanKey(input.stage, asXlsx, "xlsx");
      await putObject(target, result.bytes, PLAN_TYPES.xlsx, {
        ...(meta["uploaded-by"] ? { "uploaded-by": meta["uploaded-by"] } : {}),
        "original-name": encodeURIComponent(asXlsx),
        "edited-by": editedBy,
      });
      fileName = target.split("/").pop() ?? plan.fileName;
    }
    revalidatePath("/seasonal-plan");
    return {
      notice: result.skipped ? words.editsSavedSome(result.applied, result.skipped) : words.editsSaved(result.applied),
      fileName,
    };
  } catch (error) {
    console.error("[seasonal-plan] could not save edits", error);
    return { error: words.couldNotSaveEdits };
  }
}

/**
 * Deletes one current file FOR GOOD — the file and every old version in
 * Backblaze, with no copy in the archive. Head site admin only (for clearing
 * test uploads). Stage admins can only archive.
 */
export async function purgePlanAction(formData: FormData): Promise<PlanResult> {
  const words = await t();
  const profile = await getCurrentProfile();
  if (!profile) return { error: words.signInFirst };
  if (!isHeadSiteAdminRole(profile.role)) return { error: words.onlyHeadAdmin };
  const stage = formData.get("stage");
  if (!isStageCode(stage)) return { error: words.notAllowed };
  if (storageMissing()) return { error: words.storageMissing };
  try {
    const plan = await findPlan(stage, formData.get("file"));
    if (!plan) return {};
    // exact: "… plan.xls" must not also remove "… plan.xlsx".
    await deleteAllVersions(plan.key, undefined, true);
  } catch (error) {
    console.error("[seasonal-plan] could not delete the plan for good", error);
    return { error: words.couldNotPurge };
  }
  revalidatePath("/seasonal-plan");
  return { notice: words.purged };
}

/** Deletes one archived plan for good. Head site admin only. */
export async function purgeArchivedPlanAction(formData: FormData): Promise<PlanResult> {
  const words = await t();
  const profile = await getCurrentProfile();
  if (!profile) return { error: words.signInFirst };
  if (!isHeadSiteAdminRole(profile.role)) return { error: words.onlyHeadAdmin };
  const stage = formData.get("stage");
  const key = String(formData.get("key") ?? "");
  // Only a file inside that stage's own Archive folder — never a current
  // plan, another stage, or anything outside Seasonal Plans/.
  if (!isStageCode(stage) || !key.startsWith(archiveFolder(stage)) || key.includes("..") || !planExtension(key)) {
    return { error: words.notAllowed };
  }
  if (storageMissing()) return { error: words.storageMissing };
  try {
    await deleteAllVersions(key, undefined, true);
  } catch (error) {
    console.error("[seasonal-plan] could not delete an archived plan", error);
    return { error: words.couldNotPurge };
  }
  revalidatePath("/seasonal-plan");
  return { notice: words.purged };
}
