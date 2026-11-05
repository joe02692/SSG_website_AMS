import "server-only";

import ExcelJS from "exceljs";
import JSZip from "jszip";
import * as XLSX from "@e965/xlsx";
import type { PlanExtension } from "@/lib/seasonal-plan-rules";

/**
 * Turns a seasonal-plan workbook into what the page needs to draw it the way
 * Excel shows it (5 Nov 2026): white grid, the file's own column widths and
 * row heights, merged cells, fills, fonts, borders and alignment — and
 * TRUE/FALSE cells as checkboxes (that is how Excel stores its checkbox
 * cells, and how linked form checkboxes report their state).
 *
 * Text comes from SheetJS (Excel's number formats: dates, %, currency);
 * styling comes from ExcelJS. Nothing in the file runs.
 */

export type CellKind = "text" | "formula" | "bool" | "box";

export type RenderCell = {
  /** Column number (1 = A). */
  c: number;
  /** Displayed text. */
  t: string;
  /** Index into PlanSheetView.styles. */
  s: number;
  k: CellKind;
  /** Checkbox state for "bool" and "box" (☐ / ☑) cells. */
  v?: boolean;
  /** Merged block size. */
  cs?: number;
  rs?: number;
};

export type PlanSheetView = {
  name: string;
  rtl: boolean;
  gridLines: boolean;
  /** Visible columns: number (1 = A) and width in px. */
  cols: { n: number; w: number }[];
  /** Visible rows: number (1-based), height in px, and the cells to draw (cells covered by a merge are left out). */
  rows: { n: number; h: number; cells: RenderCell[] }[];
  /** Distinct inline styles, shared by index. */
  styles: Record<string, string>[];
  truncated: boolean;
};

const MAX_ROWS = 500;
const MAX_COLS = 50;
const BOX_EMPTY = new Set(["☐", "□"]);
const BOX_TICKED = new Set(["☑", "☒", "✅", "■"]);

// ------------------------------------------------------------------ Colours

/** Excel's legacy 64-colour palette (indexed colours). */
const INDEXED = [
  "000000", "FFFFFF", "FF0000", "00FF00", "0000FF", "FFFF00", "FF00FF", "00FFFF",
  "000000", "FFFFFF", "FF0000", "00FF00", "0000FF", "FFFF00", "FF00FF", "00FFFF",
  "800000", "008000", "000080", "808000", "800080", "008080", "C0C0C0", "808080",
  "9999FF", "993366", "FFFFCC", "CCFFFF", "660066", "FF8080", "0066CC", "CCCCFF",
  "000080", "FF00FF", "FFFF00", "00FFFF", "800080", "800000", "008080", "0000FF",
  "00CCFF", "CCFFFF", "CCFFCC", "FFFF99", "99CCFF", "FF99CC", "CC99FF", "FFCC99",
  "3366FF", "33CCCC", "99CC00", "FFCC00", "FF9900", "FF6600", "666699", "969696",
  "003366", "339966", "003300", "333300", "993300", "993366", "333399", "333333",
];

/** Office default theme, used when the file has none. Order = theme index. */
const DEFAULT_THEME = ["FFFFFF", "000000", "E7E6E6", "44546A", "4472C4", "ED7D31", "A5A5A5", "FFC000", "5B9BD5", "70AD47", "0563C1", "954F72"];

/**
 * The file's theme colours in Excel's index order (lt1, dk1, lt2, dk2,
 * accent1–6, hlink, folHlink — the first two pairs are swapped in the XML).
 */
async function themeColours(zip: JSZip | null): Promise<string[]> {
  const xml = zip ? await zip.file("xl/theme/theme1.xml")?.async("string") : undefined;
  if (!xml) return DEFAULT_THEME;
  const scheme = xml.match(/<a:clrScheme[\s\S]*?<\/a:clrScheme>/)?.[0];
  if (!scheme) return DEFAULT_THEME;
  const names = ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"];
  const found = names.map((name) => {
    const block = scheme.match(new RegExp(`<a:${name}>([\\s\\S]*?)</a:${name}>`))?.[1] ?? "";
    return block.match(/srgbClr val="([0-9A-Fa-f]{6})"/)?.[1] ?? block.match(/lastClr="([0-9A-Fa-f]{6})"/)?.[1] ?? null;
  });
  if (found.some((c) => !c)) return DEFAULT_THEME;
  const [dk1, lt1, dk2, lt2, ...rest] = found as string[];
  return [lt1, dk1, lt2, dk2, ...rest];
}

/** Excel's tint: lighten (tint > 0) or darken (tint < 0) in HSL lightness. */
function applyTint(hex: string, tint: number): string {
  if (!tint) return hex;
  const n = parseInt(hex, 16);
  let r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  let l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  l = tint < 0 ? l * (1 + tint) : l * (1 - tint) + tint;
  const hue = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) r = g = b = l;
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue(p, q, h + 1 / 3);
    g = hue(p, q, h);
    b = hue(p, q, h - 1 / 3);
  }
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

type ColourRef = { argb?: string; theme?: number; tint?: number; indexed?: number } | undefined;

function colour(ref: ColourRef, theme: string[]): string | null {
  if (!ref) return null;
  if (ref.argb && /^[0-9A-Fa-f]{8}$/.test(ref.argb)) return `#${ref.argb.slice(2)}`;
  if (ref.argb && /^[0-9A-Fa-f]{6}$/.test(ref.argb)) return `#${ref.argb}`;
  if (typeof ref.theme === "number" && theme[ref.theme]) return `#${applyTint(theme[ref.theme], ref.tint ?? 0)}`;
  if (typeof ref.indexed === "number") {
    if (ref.indexed === 64) return null; // "system foreground" = automatic
    if (INDEXED[ref.indexed]) return `#${INDEXED[ref.indexed]}`;
  }
  return null;
}

// ------------------------------------------------------------------- Styles

const BORDER_WIDTH: Record<string, string> = {
  thin: "1px solid", hair: "1px solid", medium: "2px solid", thick: "3px solid",
  dashed: "1px dashed", mediumDashed: "2px dashed", dotted: "1px dotted", double: "3px double",
  dashDot: "1px dashed", mediumDashDot: "2px dashed", dashDotDot: "1px dotted", mediumDashDotDot: "2px dotted", slantDashDot: "2px dashed",
};

function cellCss(style: Partial<ExcelJS.Style>, kind: CellKind, isNumber: boolean, theme: string[]): Record<string, string> {
  const css: Record<string, string> = {};
  const fill = style.fill as ExcelJS.FillPattern | undefined;
  if (fill?.type === "pattern" && fill.pattern && fill.pattern !== "none") {
    const bg = colour(fill.fgColor as ColourRef, theme) ?? colour(fill.bgColor as ColourRef, theme);
    if (bg) css.backgroundColor = bg;
  }
  const font = style.font;
  if (font) {
    if (font.bold) css.fontWeight = "700";
    if (font.italic) css.fontStyle = "italic";
    const deco = [font.underline ? "underline" : "", font.strike ? "line-through" : ""].filter(Boolean).join(" ");
    if (deco) css.textDecoration = deco;
    if (font.size && font.size !== 11) css.fontSize = `${Math.round(font.size * (4 / 3) * 10) / 10}px`;
    const fc = colour(font.color as ColourRef, theme);
    if (fc) css.color = fc;
  }
  const align = style.alignment;
  const horizontal = align?.horizontal;
  if (horizontal === "center" || horizontal === "centerContinuous") css.textAlign = "center";
  else if (horizontal === "right") css.textAlign = "end";
  else if (horizontal === "left") css.textAlign = "start";
  else if (horizontal === "justify" || horizontal === "distributed") css.textAlign = "justify";
  else if (kind === "bool" || kind === "box") css.textAlign = "center";
  else if (isNumber) css.textAlign = "end"; // "General": numbers to the right, like Excel
  const vertical = align?.vertical;
  css.verticalAlign = vertical === "top" ? "top" : vertical === "middle" || vertical === "distributed" || vertical === "justify" ? "middle" : "bottom";
  if (align?.wrapText) css.whiteSpace = "pre-wrap";
  if (align?.indent) css.paddingInlineStart = `${4 + align.indent * 9}px`;
  const border = style.border;
  if (border) {
    for (const [side, prop] of [["top", "borderTop"], ["bottom", "borderBottom"], ["left", "borderLeft"], ["right", "borderRight"]] as const) {
      const b = border[side];
      if (b?.style && BORDER_WIDTH[b.style]) css[prop] = `${BORDER_WIDTH[b.style]} ${colour(b.color as ColourRef, theme) ?? "#000"}`;
    }
  }
  return css;
}

// ------------------------------------------------------------------- Reader

/** Excel's column width (characters) → pixels, for its default 11pt font. */
const colPx = (width: number) => Math.round(width * 7 + 5);
/** Points → pixels. */
const rowPx = (points: number) => Math.round(points * (4 / 3));

async function load(bytes: Uint8Array, ext: PlanExtension) {
  let xlsxBytes: ArrayBuffer | Uint8Array = bytes;
  if (ext === "xls") {
    // ExcelJS reads only the zip formats: show an .xls through a converted copy.
    const legacy = XLSX.read(bytes, { type: "array", cellDates: true, bookVBA: false });
    xlsxBytes = XLSX.write(legacy, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  }
  const buffer = xlsxBytes instanceof Uint8Array
    ? (xlsxBytes.buffer.slice(xlsxBytes.byteOffset, xlsxBytes.byteOffset + xlsxBytes.byteLength) as ArrayBuffer)
    : xlsxBytes;
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(buffer);
  const zip = await JSZip.loadAsync(buffer).catch(() => null);
  return { book, zip };
}

/** The names of the workbook's sheets, in order. */
export function planSheetNames(bytes: Uint8Array): string[] {
  return XLSX.read(bytes, { type: "array", bookSheets: true }).SheetNames;
}

/**
 * One sheet, ready to draw. `sheetName` must exist (see planSheetNames).
 */
export async function renderPlanSheet(bytes: Uint8Array, ext: PlanExtension, sheetName: string): Promise<PlanSheetView | null> {
  const text = XLSX.read(bytes, { type: "array", cellDates: true, cellNF: true, bookVBA: false, sheets: [sheetName] });
  const textSheet = text.Sheets[sheetName];
  const rtlBook = Boolean(text.Workbook?.Views?.[0]?.RTL);
  const { book, zip } = await load(bytes, ext);
  const sheet = book.getWorksheet(sheetName);
  if (!sheet || !textSheet) return null;
  const theme = await themeColours(zip);

  const view = sheet.views?.[0] as (Partial<ExcelJS.WorksheetView> & { rightToLeft?: boolean; showGridLines?: boolean }) | undefined;
  const rtl = Boolean(view?.rightToLeft) || rtlBook;
  const gridLines = view?.showGridLines !== false;

  // How far the sheet goes: used cells, merges and SheetJS's own range.
  const ref = textSheet["!ref"] ? XLSX.utils.decode_range(textSheet["!ref"]) : null;
  let lastRow = Math.max(sheet.actualRowCount ? sheet.rowCount : 0, ref ? ref.e.r + 1 : 0);
  let lastCol = Math.max(sheet.actualColumnCount ? sheet.columnCount : 0, ref ? ref.e.c + 1 : 0);
  const merges: { top: number; left: number; bottom: number; right: number }[] = [];
  for (const range of (sheet.model as { merges?: string[] }).merges ?? []) {
    const r = XLSX.utils.decode_range(range);
    merges.push({ top: r.s.r + 1, left: r.s.c + 1, bottom: r.e.r + 1, right: r.e.c + 1 });
    lastRow = Math.max(lastRow, r.e.r + 1);
    lastCol = Math.max(lastCol, r.e.c + 1);
  }
  const truncated = lastRow > MAX_ROWS;
  lastRow = Math.min(lastRow, MAX_ROWS);
  lastCol = Math.min(Math.max(lastCol, 1), MAX_COLS);

  const defaultWidth = sheet.properties.defaultColWidth ?? 8.43;
  const defaultHeight = sheet.properties.defaultRowHeight ?? 15;

  const cols: PlanSheetView["cols"] = [];
  for (let c = 1; c <= lastCol; c++) {
    const col = sheet.getColumn(c);
    if (col.hidden) continue;
    cols.push({ n: c, w: colPx(col.width ?? defaultWidth) });
  }
  const visibleCols = new Set(cols.map((c) => c.n));

  const covered = new Set<string>();
  const masters = new Map<string, { cs: number; rs: number }>();
  for (const m of merges) {
    let cs = 0;
    for (let c = m.left; c <= Math.min(m.right, lastCol); c++) if (visibleCols.has(c)) cs++;
    masters.set(`${m.top}:${m.left}`, { cs: Math.max(cs, 1), rs: Math.min(m.bottom, lastRow) - m.top + 1 });
    for (let r = m.top; r <= m.bottom; r++) {
      for (let c = m.left; c <= m.right; c++) if (r !== m.top || c !== m.left) covered.add(`${r}:${c}`);
    }
  }

  const styleIndex = new Map<string, number>();
  const styles: Record<string, string>[] = [];
  const styleOf = (css: Record<string, string>) => {
    const key = JSON.stringify(css);
    let i = styleIndex.get(key);
    if (i === undefined) {
      i = styles.length;
      styles.push(css);
      styleIndex.set(key, i);
    }
    return i;
  };

  const rows: PlanSheetView["rows"] = [];
  for (let r = 1; r <= lastRow; r++) {
    const row = sheet.getRow(r);
    if (row.hidden) continue;
    const cells: RenderCell[] = [];
    for (const { n: c } of cols) {
      if (covered.has(`${r}:${c}`)) continue;
      const cell = row.getCell(c);
      const address = XLSX.utils.encode_cell({ r: r - 1, c: c - 1 });
      const textCell = textSheet[address] as XLSX.CellObject | undefined;
      const shown = textCell ? String(XLSX.utils.format_cell(textCell) ?? "") : "";
      const isFormula = Boolean(textCell?.f) || cell.type === ExcelJS.ValueType.Formula;
      let kind: CellKind = isFormula ? "formula" : "text";
      let value: boolean | undefined;
      if (!isFormula && textCell?.t === "b") {
        kind = "bool";
        value = Boolean(textCell.v);
      } else if (!isFormula && (BOX_EMPTY.has(shown.trim()) || BOX_TICKED.has(shown.trim()))) {
        kind = "box";
        value = BOX_TICKED.has(shown.trim());
      }
      const css = cellCss(cell.style ?? {}, kind, textCell?.t === "n" || textCell?.t === "d", theme);
      const merge = masters.get(`${r}:${c}`);
      cells.push({
        c,
        t: shown,
        s: styleOf(css),
        k: kind,
        ...(value !== undefined ? { v: value } : {}),
        ...(merge && merge.cs > 1 ? { cs: merge.cs } : {}),
        ...(merge && merge.rs > 1 ? { rs: merge.rs } : {}),
      });
    }
    rows.push({ n: r, h: rowPx(row.height ?? defaultHeight), cells });
  }

  // Drop trailing rows with nothing in them (Excel files often carry many
  // empty, unstyled rows at the end).
  while (rows.length > 1) {
    const last = rows[rows.length - 1];
    const empty = last.cells.every((cell) => cell.t === "" && cell.k === "text" && Object.keys(styles[cell.s]).length <= 1);
    if (!empty) break;
    rows.pop();
  }

  return { name: sheetName, rtl, gridLines, cols, rows, styles, truncated };
}
