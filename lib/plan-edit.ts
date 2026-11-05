import "server-only";

import ExcelJS from "exceljs";
import * as XLSX from "@e965/xlsx";
import type { PlanExtension } from "@/lib/seasonal-plan-rules";

/**
 * Saving cell edits made on the seasonal-plan page back into the Excel file
 * (5 Nov 2026 — every leader can edit).
 *
 * ExcelJS rewrites the workbook keeping values, formulas, column widths,
 * fonts, fills, borders and merged cells. Two things can't survive a rewrite
 * and Zyad accepted that: macros in an .xlsm, and the old binary .xls format —
 * both are saved as .xlsx (the caller archives the original first).
 *
 * Only the cells that changed are written, into the file as it is NOW, so two
 * leaders editing different cells at the same time don't undo each other.
 */

export type CellEdit = { address: string; value: string };

export const MAX_EDITS_PER_SAVE = 2000;
export const MAX_CELL_LENGTH = 2000;

/** "A1" … "XFD1048576", nothing else. */
const ADDRESS = /^[A-Z]{1,3}[1-9][0-9]{0,6}$/;

export function isCellAddress(value: unknown): value is string {
  return typeof value === "string" && ADDRESS.test(value);
}

const NUMBER = /^-?(?:\d+|\d*\.\d+)(?:[eE][-+]?\d+)?$/;

/** What to store for what the leader typed, given what the cell held before. */
function toCellValue(text: string, previous: ExcelJS.CellValue): ExcelJS.CellValue {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  // Numbers stay numbers (so sums keep working) — Arabic digits included.
  const latin = trimmed.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/٫/g, ".");
  if (NUMBER.test(latin) && (previous === null || previous === undefined || typeof previous === "number")) {
    return Number(latin);
  }
  // A date cell typed as YYYY-MM-DD stays a date.
  if (previous instanceof Date && /^\d{4}-\d{2}-\d{2}$/.test(latin)) {
    const date = new Date(`${latin}T00:00:00Z`);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return text;
}

/** True when the cell holds a formula (shared or not) — those are locked. */
function isFormula(cell: ExcelJS.Cell): boolean {
  if (cell.type === ExcelJS.ValueType.Formula) return true;
  const v = cell.value as { formula?: string; sharedFormula?: string } | null;
  return Boolean(v && typeof v === "object" && ("formula" in v || "sharedFormula" in v));
}

async function loadWorkbook(bytes: Uint8Array, ext: PlanExtension): Promise<ExcelJS.Workbook> {
  const book = new ExcelJS.Workbook();
  if (ext === "xls") {
    // ExcelJS can't read the old binary format: convert it to .xlsx first
    // (values and formulas survive; styling of an .xls doesn't).
    const legacy = XLSX.read(bytes, { type: "array", cellDates: true, bookVBA: false });
    const converted = XLSX.write(legacy, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    await book.xlsx.load(converted);
  } else {
    await book.xlsx.load(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  }
  return book;
}

export type EditResult = {
  bytes: Uint8Array;
  applied: number;
  /** Cells that were formulas (locked) or out of range. */
  skipped: number;
};

/**
 * Applies `edits` to `sheetName` and returns the new .xlsx file. Throws if
 * the sheet doesn't exist.
 */
export async function applyPlanEdits(
  bytes: Uint8Array,
  ext: PlanExtension,
  sheetName: string,
  edits: CellEdit[],
): Promise<EditResult> {
  const book = await loadWorkbook(bytes, ext);
  const sheet = book.getWorksheet(sheetName);
  if (!sheet) throw new Error(`No sheet called ${sheetName}`);

  let applied = 0;
  let skipped = 0;
  for (const edit of edits) {
    if (!isCellAddress(edit.address)) {
      skipped++;
      continue;
    }
    // A merged block keeps its value in its top-left cell.
    const found = sheet.getCell(edit.address);
    const cell = found.isMerged ? found.master : found;
    if (isFormula(cell)) {
      skipped++;
      continue;
    }
    const value = toCellValue(edit.value.slice(0, MAX_CELL_LENGTH), cell.value);
    // Rich text / hyperlinks become plain text once edited.
    cell.value = value;
    applied++;
  }

  // Formulas (a total under an edited column) keep their old result until
  // recalculated: Excel and LibreOffice redo every formula when the file is
  // next opened or downloaded.
  book.calcProperties.fullCalcOnLoad = true;

  const out = await book.xlsx.writeBuffer();
  return { bytes: new Uint8Array(out as ArrayBuffer), applied, skipped };
}
