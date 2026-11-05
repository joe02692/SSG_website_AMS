import "server-only";

import * as XLSX from "@e965/xlsx";
import type { Profile } from "@/lib/dal";
import { copyObject, deleteAllVersions, listObjects, objectMetadata } from "@/lib/b2";
import { SCOUT_STAGES } from "@/lib/onboarding";
import { adminStageCode } from "@/lib/stage-admins";
import { planExtension, type PlanExtension } from "@/lib/seasonal-plan-rules";

/**
 * Seasonal plans — up to MAX_PLANS_PER_STAGE Excel files per stage (5 Nov
 * 2026; it was one), in the same private Backblaze bucket as the members'
 * documents (no extra storage service). Each file keeps its uploaded name:
 *
 *   Seasonal Plans/Cubs/Cubs seasonal plan.xlsx
 *   Seasonal Plans/Cubs/Winter camp schedule.xlsx
 *
 * Replacing or removing a plan never deletes it: the old file moves to the
 * stage's Archive folder, dated, and leaders can still open it from the page
 * (Zyad's decision, 30 Sep 2026 — it replaced "delete for good"):
 *
 *   Seasonal Plans/Cubs/Archive/2026-09-30 14-05 — Cubs plan.xlsx
 *
 * Who can do what — checked in app/seasonal-plan/actions.ts on every call:
 *   • view / download / EDIT CELLS: every leader and staff role (the page
 *     itself is leaders-only). Edits are saved by lib/plan-edit.ts.
 *   • add / replace / archive: the head site admin for any stage; a stage
 *     admin for the stage the head admin assigned them (admin_stage_id)
 *   • delete for good: the head site admin only
 */

export const PLAN_ROOT = "Seasonal Plans";

/** How many current plan files one stage may have. */
export const MAX_PLANS_PER_STAGE = 3;

const STAGE_CODES = SCOUT_STAGES.map((s) => s.value);

export function isStageCode(value: unknown): value is string {
  return typeof value === "string" && STAGE_CODES.includes(value);
}

/** "kashafa" → "Seasonal Plans/Scouts/" */
export function planFolder(stageCode: string): string {
  const stage = SCOUT_STAGES.find((s) => s.value === stageCode);
  return `${PLAN_ROOT}/${stage?.label ?? stageCode}/`;
}

/** Which stages this member may add or delete plans for. */
export async function managedStages(profile: Profile): Promise<{
  codes: string[];
  migrationMissing: boolean;
}> {
  if (profile.role === "head_site_admin") return { codes: STAGE_CODES, migrationMissing: false };
  if (profile.role !== "stage_admin") return { codes: [], migrationMissing: false };
  const { code, migrationMissing } = await adminStageCode(profile.id);
  return { codes: code ? [code] : [], migrationMissing };
}

export type PlanFile = {
  stage: string;
  key: string;
  /** The last part of the key — how the page and actions name a file. */
  fileName: string;
  ext: PlanExtension;
  size: number;
  updatedAt: string | null;
  uploadedBy: string | null;
  /** Who last saved cell edits on the site, if anyone. */
  editedBy: string | null;
  originalName: string | null;
};

function decode(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Every stage's current plan files (up to three each), by stage code, in a
 * stable order (by file name). Stages without a plan are absent.
 */
export async function listPlans(): Promise<Record<string, PlanFile[]>> {
  const objects = await listObjects(`${PLAN_ROOT}/`);
  const byStage: Record<string, PlanFile[]> = {};
  for (const code of STAGE_CODES) {
    const folder = planFolder(code);
    const files = objects
      .filter((o) => o.key.startsWith(folder) && !o.key.startsWith(archiveFolder(code)) && planExtension(o.key))
      // Only files directly in the stage folder.
      .filter((o) => !o.key.slice(folder.length).includes("/"))
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(
        (o): PlanFile => ({
          stage: code,
          key: o.key,
          fileName: o.key.slice(folder.length),
          ext: planExtension(o.key)!,
          size: o.size,
          updatedAt: o.lastModified?.toISOString() ?? null,
          uploadedBy: null,
          editedBy: null,
          originalName: null,
        }),
      );
    if (files.length) byStage[code] = files;
  }
  // Who uploaded / edited lives in each object's metadata: one HEAD per file,
  // at most 24, in parallel.
  await Promise.all(
    Object.values(byStage)
      .flat()
      .map(async (plan) => {
        const meta = await objectMetadata(plan.key);
        plan.uploadedBy = decode(meta?.["uploaded-by"]);
        plan.editedBy = decode(meta?.["edited-by"]);
        plan.originalName = decode(meta?.["original-name"]);
      }),
  );
  return byStage;
}

/** One of a stage's current files by its file name, or null. */
export async function findPlan(stageCode: string, fileName: unknown): Promise<PlanFile | null> {
  if (typeof fileName !== "string" || !fileName || fileName.includes("/") || fileName.includes("..")) return null;
  return ((await listPlans())[stageCode] ?? []).find((p) => p.fileName === fileName) ?? null;
}

/**
 * Where a new file goes: its own (cleaned) name in the stage folder, with
 * " (2)", " (3)" … if that name is taken.
 */
export async function newPlanKey(stageCode: string, originalName: string, ext: PlanExtension): Promise<string> {
  const folder = planFolder(stageCode);
  const base = safeName(originalName.replace(/\.[^.]+$/, ""));
  const taken = new Set((await listObjects(folder)).map((o) => o.key.toLowerCase()));
  for (let n = 1; n < 100; n++) {
    const key = `${folder}${base}${n === 1 ? "" : ` (${n})`}.${ext}`;
    if (!taken.has(key.toLowerCase())) return key;
  }
  return `${folder}${base} ${Date.now()}.${ext}`;
}

// ------------------------------------------------------------ Archive

/** "kashafa" → "Seasonal Plans/Scouts/Archive/" */
export function archiveFolder(stageCode: string): string {
  return `${planFolder(stageCode)}Archive/`;
}

/** "2026-09-30 14-05" in Cairo time — sorts by date, and is safe in a file name. */
function stamp(date: Date): string {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(date);
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return `${v("year")}-${v("month")}-${v("day")} ${v("hour")}-${v("minute")}`;
}

/** A file name without characters that would invent folders or break downloads. */
export function safeName(name: string): string {
  return name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "plan";
}

/**
 * Moves one current plan file into the stage's Archive folder — copied
 * (keeping who uploaded it) and only then removed from the stage folder.
 * Used when a file is replaced, taken down, or converted to .xlsx by an edit.
 */
export async function archivePlanFile(stageCode: string, key: string): Promise<void> {
  const meta = await objectMetadata(key);
  if (!meta) return; // already gone
  const ext = planExtension(key)!;
  const original = decode(meta["original-name"]);
  const base = safeName((original ?? key.split("/").pop() ?? "plan").replace(/\.[^.]+$/, ""));
  const when = stamp(new Date());
  let target = `${archiveFolder(stageCode)}${when} — ${base}.${ext}`;
  // Two archives in the same minute keep both.
  for (let n = 2; (await listObjects(target)).some((o) => o.key === target); n++) {
    target = `${archiveFolder(stageCode)}${when} — ${base} (${n}).${ext}`;
  }
  await copyObject(key, target);
  // Only the exact key — and only after the copy succeeded.
  await deleteAllVersions(key, undefined, true);
}

/** How many archived plans each stage has (one listing for all stages). */
export async function archiveCounts(): Promise<Record<string, number>> {
  const objects = await listObjects(`${PLAN_ROOT}/`);
  const counts: Record<string, number> = {};
  for (const code of STAGE_CODES) {
    const n = objects.filter((o) => o.key.startsWith(archiveFolder(code)) && planExtension(o.key)).length;
    if (n) counts[code] = n;
  }
  return counts;
}

export type ArchivedPlan = { key: string; name: string; size: number; archivedAt: string | null };

/** A stage's archived plans, newest first. */
export async function listArchive(stageCode: string): Promise<ArchivedPlan[]> {
  const folder = archiveFolder(stageCode);
  return (await listObjects(folder))
    .filter((o) => planExtension(o.key))
    .map((o) => ({
      key: o.key,
      name: o.key.slice(folder.length),
      size: o.size,
      archivedAt: o.lastModified?.toISOString() ?? null,
    }))
    .sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? "") || b.name.localeCompare(a.name));
}

// ------------------------------------------------------------ Checking files

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // .xlsx / .xlsm are ZIP packages
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]; // .xls

function startsWith(bytes: Uint8Array, magic: number[]): boolean {
  return magic.every((b, i) => bytes[i] === b);
}

/**
 * True only for a real, readable Excel workbook of the claimed kind. A file
 * renamed to .xlsx (a PDF, a photo, a script) fails here, because the
 * extension is just a name — the first bytes and a real parse are the proof.
 */
export function isRealExcel(ext: PlanExtension, bytes: Uint8Array): boolean {
  const magicOk = ext === "xls" ? startsWith(bytes, OLE_MAGIC) : startsWith(bytes, ZIP_MAGIC);
  if (!magicOk) return false;
  try {
    const book = XLSX.read(bytes, { type: "array", sheetRows: 1, bookVBA: false });
    return book.SheetNames.length > 0;
  } catch {
    return false;
  }
}

// The page preview lives in lib/plan-render.ts (drawn as in Excel).
