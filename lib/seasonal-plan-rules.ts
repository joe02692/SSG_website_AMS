/**
 * Seasonal plan file rules, shared by the browser (to refuse a wrong file
 * before uploading it) and the server (which checks again — the browser's
 * check is a courtesy, not a guard).
 *
 * Excel only: modern .xlsx, macro-enabled .xlsm, and the old Excel 97–2003
 * .xls. The content type is decided from the extension, never from what the
 * browser reports — phones often report nothing, or "application/octet-stream".
 */
export const PLAN_TYPES = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xlsm: "application/vnd.ms-excel.sheet.macroEnabled.12",
  xls: "application/vnd.ms-excel",
} as const;

export type PlanExtension = keyof typeof PLAN_TYPES;

/** For the file picker's `accept` — extensions and types both, for old phones. */
export const PLAN_ACCEPT = [
  ...Object.keys(PLAN_TYPES).map((ext) => `.${ext}`),
  ...Object.values(PLAN_TYPES),
].join(",");

export const MAX_PLAN_BYTES = 10 * 1024 * 1024;

/** "Plan 2026.XLSX" → "xlsx"; anything that isn't Excel → null. */
export function planExtension(fileName: string): PlanExtension | null {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return ext in PLAN_TYPES ? (ext as PlanExtension) : null;
}
