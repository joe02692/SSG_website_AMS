import "server-only";

import * as XLSX from "@e965/xlsx";
import type { Profile } from "@/lib/dal";
import { deleteAllVersions, listObjects, objectMetadata } from "@/lib/b2";
import { SCOUT_STAGES } from "@/lib/onboarding";
import { adminStageCode } from "@/lib/stage-admins";
import { planExtension, type PlanExtension } from "@/lib/seasonal-plan-rules";

/**
 * Seasonal plans — one Excel file per stage, in the same private Backblaze
 * bucket as the members' documents (no extra storage service):
 *
 *   Seasonal Plans/Cubs/Cubs seasonal plan.xlsx
 *   Seasonal Plans/Senior Guides/Senior Guides seasonal plan.xls
 *
 * Replacing or deleting a plan removes the old file FOR GOOD, including
 * Backblaze's hidden older versions (Zyad's decision, 30 Sep 2026).
 *
 * Who can do what — checked in app/seasonal-plan/actions.ts on every call:
 *   • view / download: every leader and staff role (the page itself is
 *     leaders-only)
 *   • add / replace / delete: the head site admin for any stage; a stage
 *     admin for the stage the head admin assigned them (admin_stage_id)
 */

export const PLAN_ROOT = "Seasonal Plans";

const STAGE_CODES = SCOUT_STAGES.map((s) => s.value);

export function isStageCode(value: unknown): value is string {
  return typeof value === "string" && STAGE_CODES.includes(value);
}

/** "kashafa" → "Seasonal Plans/Scouts/" */
export function planFolder(stageCode: string): string {
  const stage = SCOUT_STAGES.find((s) => s.value === stageCode);
  return `${PLAN_ROOT}/${stage?.label ?? stageCode}/`;
}

export function planKey(stageCode: string, ext: PlanExtension): string {
  const stage = SCOUT_STAGES.find((s) => s.value === stageCode);
  return `${planFolder(stageCode)}${stage?.label ?? stageCode} seasonal plan.${ext}`;
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
  ext: PlanExtension;
  size: number;
  updatedAt: string | null;
  uploadedBy: string | null;
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

/** The current plan for every stage that has one, by stage code. */
export async function listPlans(): Promise<Record<string, PlanFile>> {
  const objects = await listObjects(`${PLAN_ROOT}/`);
  const byStage: Record<string, PlanFile> = {};
  for (const code of STAGE_CODES) {
    const folder = planFolder(code);
    // Newest wins, should a stray second file ever sit in the folder.
    const inFolder = objects
      .filter((o) => o.key.startsWith(folder) && planExtension(o.key))
      .sort((a, b) => (b.lastModified?.getTime() ?? 0) - (a.lastModified?.getTime() ?? 0));
    const current = inFolder[0];
    if (!current) continue;
    byStage[code] = {
      stage: code,
      key: current.key,
      ext: planExtension(current.key)!,
      size: current.size,
      updatedAt: current.lastModified?.toISOString() ?? null,
      uploadedBy: null,
      originalName: null,
    };
  }
  // Who uploaded it lives in the object's metadata: one HEAD per plan, at
  // most eight, in parallel.
  await Promise.all(
    Object.values(byStage).map(async (plan) => {
      const meta = await objectMetadata(plan.key);
      plan.uploadedBy = decode(meta?.["uploaded-by"]);
      plan.originalName = decode(meta?.["original-name"]);
    }),
  );
  return byStage;
}

/** Removes every file (and every old version) in a stage's plan folder, except `keep`. */
export async function clearPlanFolder(stageCode: string, keep?: string): Promise<void> {
  await deleteAllVersions(planFolder(stageCode), keep);
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

// ------------------------------------------------------------ Preview

export type PlanSheet = { name: string; rows: string[][]; truncated: boolean; rtl: boolean };

const MAX_ROWS = 500;
const MAX_COLS = 40;

/**
 * The workbook as plain text tables, for showing on the page. Values are
 * Excel's formatted text (dates look like dates, 0.5 like 50% if formatted
 * so). Nothing in the file runs — SheetJS reads cell values only, and macros
 * in an .xlsm are ignored.
 */
export function readPlanSheets(bytes: Uint8Array): PlanSheet[] {
  const book = XLSX.read(bytes, {
    type: "array",
    sheetRows: MAX_ROWS + 1,
    cellDates: true,
    bookVBA: false,
  });
  // Excel stores "sheet right-to-left" as a workbook view setting.
  const rtl = Boolean(book.Workbook?.Views?.[0]?.RTL);
  return book.SheetNames.map((name) => {
    const sheet = book.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      blankrows: false,
      defval: "",
    });
    const width = Math.min(
      MAX_COLS,
      rows.reduce((max, row) => Math.max(max, row.length), 0),
    );
    const text = rows
      .slice(0, MAX_ROWS)
      .map((row) => Array.from({ length: width }, (_, c) => String(row[c] ?? "").trim()));
    // Drop columns that are empty all the way down (common at the right edge).
    const used = Array.from({ length: width }, (_, c) => text.some((row) => row[c] !== ""));
    const lastUsed = used.lastIndexOf(true);
    return {
      name,
      rows: text.map((row) => row.slice(0, lastUsed + 1)),
      truncated: rows.length > MAX_ROWS,
      rtl,
    };
  });
}
