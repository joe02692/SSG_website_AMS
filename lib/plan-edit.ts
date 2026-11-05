import "server-only";

import JSZip from "jszip";
import { DOMParser, XMLSerializer, type Document, type Element } from "@xmldom/xmldom";
import * as XLSX from "@e965/xlsx";
import type { PlanExtension } from "@/lib/seasonal-plan-rules";

/**
 * Saving cell edits made on the seasonal-plan page back into the Excel file
 * (5 Nov 2026 — every leader can edit).
 *
 * The file is changed SURGICALLY: only the edited <c> elements inside the
 * sheet's XML are rewritten. Everything else in the package — styles,
 * Excel's checkbox cells, form controls, conditional formatting, data
 * validation, charts, images, comments, and the macros of an .xlsm — is left
 * byte-for-byte as it was. (An earlier version rebuilt the whole workbook,
 * which could drop features the library didn't know about.)
 *
 * Only the old binary .xls format can't be edited in place: it is converted
 * to .xlsx first (the caller archives the original).
 *
 * Only the cells that changed are written, into the file as it is NOW, so two
 * leaders editing different cells at the same time don't undo each other.
 */

export type CellEdit = { address: string; value: string };

export const MAX_EDITS_PER_SAVE = 2000;
export const MAX_CELL_LENGTH = 2000;

const MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

/** "A1" … "XFD1048576", nothing else. */
const ADDRESS = /^([A-Z]{1,3})([1-9][0-9]{0,6})$/;

export function isCellAddress(value: unknown): value is string {
  return typeof value === "string" && ADDRESS.test(value);
}

function columnNumber(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function columnLetters(n: number): string {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const NUMBER = /^-?(?:\d+|\d*\.\d+)(?:[eE][-+]?\d+)?$/;
const BUILTIN_DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

/** Which style indexes (the s="" on a cell) show numbers as dates. */
function dateStyles(stylesXml: string | undefined): Set<number> {
  const result = new Set<number>();
  if (!stylesXml) return result;
  const custom = new Map<number, string>();
  for (const m of stylesXml.matchAll(/<numFmt\b[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g)) custom.set(Number(m[1]), m[2]);
  const xfs = stylesXml.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] ?? "";
  let i = 0;
  for (const m of xfs.matchAll(/<xf\b([^>]*?)(\/>|>)/g)) {
    const id = Number(m[1].match(/numFmtId="(\d+)"/)?.[1] ?? 0);
    const code = custom.get(id)?.replace(/"[^"]*"|\[[^\]]*\]/g, "") ?? "";
    if (BUILTIN_DATE_FORMATS.has(id) || /[dy]/i.test(code)) result.add(i);
    i++;
  }
  return result;
}

/** A typed date (2026-11-05, 5/11/2026) → Excel's day number, or null. */
function excelDate(text: string): number | null {
  let y: number, m: number, d: number;
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const dmy = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (dmy) [d, m, y] = [Number(dmy[1]), Number(dmy[2]), Number(dmy[3])];
  else return null;
  const ms = Date.UTC(y, m - 1, d);
  if (Number.isNaN(ms) || new Date(ms).getUTCDate() !== d) return null;
  return Math.round(ms / 86_400_000) + 25569; // days since 1899-12-30
}

type Kind = { t: "empty" } | { t: "n"; v: string } | { t: "b"; v: boolean } | { t: "s"; v: string };

/** What to store for what the leader typed, given what the cell held before. */
function classify(text: string, previousType: string | null, isDateStyle: boolean): Kind {
  const trimmed = text.trim();
  if (trimmed === "") return { t: "empty" };
  if (previousType === "b" && /^(true|false|1|0)$/i.test(trimmed)) return { t: "b", v: /^(true|1)$/i.test(trimmed) };
  const latin = trimmed.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/٫/g, ".");
  const wasNumber = previousType === null || previousType === "n";
  if (wasNumber && isDateStyle) {
    const serial = excelDate(latin);
    if (serial !== null) return { t: "n", v: String(serial) };
  }
  if (wasNumber && NUMBER.test(latin)) return { t: "n", v: String(Number(latin)) };
  return { t: "s", v: text };
}

function children(el: Element, localName: string): Element[] {
  const out: Element[] = [];
  for (let n = el.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 1 && (n as Element).localName === localName) out.push(n as Element);
  }
  return out;
}

/** The sheet's XML path inside the package, from its name. */
async function sheetPath(zip: JSZip, sheetName: string): Promise<string | null> {
  const parser = new DOMParser();
  const workbook = parser.parseFromString(await zip.file("xl/workbook.xml")!.async("string"), "text/xml");
  const rels = parser.parseFromString(await zip.file("xl/_rels/workbook.xml.rels")!.async("string"), "text/xml");
  const sheet = Array.from(workbook.getElementsByTagNameNS(MAIN_NS, "sheet")).find((s) => s.getAttribute("name") === sheetName);
  const rid = sheet?.getAttributeNS(REL_NS, "id");
  if (!rid) return null;
  const rel = Array.from(rels.getElementsByTagName("Relationship")).find((r) => r.getAttribute("Id") === rid);
  const target = rel?.getAttribute("Target");
  if (!target) return null;
  return target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
}

/** Excel recalculates every formula the next time the file is opened. */
async function requestRecalculation(zip: JSZip): Promise<void> {
  const path = "xl/workbook.xml";
  let xml = await zip.file(path)!.async("string");
  if (/<calcPr\b[^>]*fullCalcOnLoad=/.test(xml)) xml = xml.replace(/fullCalcOnLoad="[^"]*"/, 'fullCalcOnLoad="1"');
  else if (/<calcPr\b/.test(xml)) xml = xml.replace(/<calcPr\b/, '<calcPr fullCalcOnLoad="1"');
  else if (/<\/definedNames>/.test(xml)) xml = xml.replace(/<\/definedNames>/, '</definedNames><calcPr fullCalcOnLoad="1"/>');
  else xml = xml.replace(/<\/sheets>/, '</sheets><calcPr fullCalcOnLoad="1"/>');
  zip.file(path, xml);
}

export type EditResult = {
  bytes: Uint8Array;
  applied: number;
  /** Cells that were formulas (locked) or invalid. */
  skipped: number;
};

/**
 * Applies `edits` to `sheetName` and returns the new file — same format as
 * before (.xlsx or .xlsm), except .xls which comes back as .xlsx. Throws if
 * the sheet doesn't exist.
 */
export async function applyPlanEdits(
  bytes: Uint8Array,
  ext: PlanExtension,
  sheetName: string,
  edits: CellEdit[],
): Promise<EditResult> {
  let source: Uint8Array = bytes;
  if (ext === "xls") {
    const legacy = XLSX.read(bytes, { type: "array", cellDates: false, cellStyles: true, bookVBA: false });
    source = new Uint8Array(XLSX.write(legacy, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
  }
  const zip = await JSZip.loadAsync(source);
  const path = await sheetPath(zip, sheetName);
  if (!path || !zip.file(path)) throw new Error(`No sheet called ${sheetName}`);
  const dates = dateStyles(await zip.file("xl/styles.xml")?.async("string"));

  const doc: Document = new DOMParser().parseFromString(await zip.file(path)!.async("string"), "text/xml");
  const sheetData = doc.getElementsByTagNameNS(MAIN_NS, "sheetData")[0];
  if (!sheetData) throw new Error("Sheet has no data section");

  const make = (name: string) => doc.createElementNS(MAIN_NS, name);
  const rowsByNumber = new Map<number, Element>();
  for (const row of children(sheetData, "row")) rowsByNumber.set(Number(row.getAttribute("r")), row);

  let applied = 0;
  let skipped = 0;
  let maxRow = 0;
  let maxCol = 0;

  for (const edit of edits) {
    const m = edit.address.match(ADDRESS);
    if (!m) {
      skipped++;
      continue;
    }
    const col = columnNumber(m[1]);
    const rowNumber = Number(m[2]);

    // Find or create the <row>, keeping rows in order.
    let row = rowsByNumber.get(rowNumber);
    if (!row) {
      row = make("row");
      row.setAttribute("r", String(rowNumber));
      const after = Array.from(rowsByNumber.keys()).filter((n) => n > rowNumber).sort((a, b) => a - b)[0];
      sheetData.insertBefore(row, after ? rowsByNumber.get(after)! : null);
      rowsByNumber.set(rowNumber, row);
    }

    // "spans" is only a hint for Excel; a new cell could fall outside it.
    row.removeAttribute("spans");

    // Find or create the <c>, keeping cells in column order.
    const cells = children(row, "c");
    let cell = cells.find((c) => c.getAttribute("r") === edit.address);
    if (!cell) {
      cell = make("c");
      cell.setAttribute("r", edit.address);
      const next = cells.find((c) => columnNumber((c.getAttribute("r") ?? "").replace(/\d+$/, "")) > col);
      // A new cell takes the row's style, as Excel would.
      const rowStyle = row.getAttribute("customFormat") === "1" ? row.getAttribute("s") : null;
      if (rowStyle) cell.setAttribute("s", rowStyle);
      row.insertBefore(cell, next ?? null);
    }

    // Formula cells are locked.
    if (children(cell, "f").length > 0) {
      skipped++;
      continue;
    }

    const kind = classify(
      edit.value.slice(0, MAX_CELL_LENGTH),
      cell.getAttribute("t") ?? (children(cell, "v").length ? "n" : null),
      dates.has(Number(cell.getAttribute("s") ?? -1)),
    );
    for (const old of [...children(cell, "v"), ...children(cell, "is")]) cell.removeChild(old);
    cell.removeAttribute("t");
    if (kind.t === "n") {
      const v = make("v");
      v.appendChild(doc.createTextNode(kind.v));
      cell.appendChild(v);
    } else if (kind.t === "b") {
      cell.setAttribute("t", "b");
      const v = make("v");
      v.appendChild(doc.createTextNode(kind.v ? "1" : "0"));
      cell.appendChild(v);
    } else if (kind.t === "s") {
      // Inline text: the shared-strings table is left untouched.
      cell.setAttribute("t", "inlineStr");
      const is = make("is");
      const t = make("t");
      t.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve");
      t.appendChild(doc.createTextNode(kind.v));
      is.appendChild(t);
      cell.appendChild(is);
    }
    applied++;
    maxRow = Math.max(maxRow, rowNumber);
    maxCol = Math.max(maxCol, col);
  }

  // Keep the sheet's declared size covering any new cells.
  const dimension = doc.getElementsByTagNameNS(MAIN_NS, "dimension")[0];
  const ref = dimension?.getAttribute("ref");
  if (dimension && ref && maxRow) {
    const range = XLSX.utils.decode_range(ref.includes(":") ? ref : `${ref}:${ref}`);
    const endRow = Math.max(range.e.r + 1, maxRow);
    const endCol = Math.max(range.e.c + 1, maxCol);
    dimension.setAttribute("ref", `${columnLetters(range.s.c + 1)}${range.s.r + 1}:${columnLetters(endCol)}${endRow}`);
  }

  zip.file(path, new XMLSerializer().serializeToString(doc));
  await requestRecalculation(zip);
  const out = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
  return { bytes: out, applied, skipped };
}
