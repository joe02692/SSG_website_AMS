"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { savePlanEditsAction } from "@/app/seasonal-plan/actions";
import type { PlanSheetView, RenderCell } from "@/lib/plan-render";
import { useT } from "@/lib/i18n/client";

/** 1 → "A", 26 → "Z", 27 → "AA" … */
function columnName(n: number): string {
  let name = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    name = String.fromCharCode(65 + r) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

const EXTRA_ROWS = 5; // blank rows offered at the bottom while editing
const EXTRA_COLS = 2; // blank columns offered at the end while editing
const DEFAULT_COL = 69; // px — Excel's 8.43-character column
const DEFAULT_ROW = 20; // px — Excel's 15pt row
const HEADER_COL = 44; // px — the row-number column

/**
 * One sheet of a seasonal plan, drawn the way Excel shows it (5 Nov 2026):
 * white grid with column letters and row numbers, the file's own widths,
 * heights, merged cells, colours, fonts, borders and alignment.
 *
 * Every leader can edit it in place: "Edit", click a cell, type, Save — only
 * the changed cells are sent and written into the file as it is at that
 * moment (lib/plan-edit.ts). Checkbox cells (TRUE/FALSE, or ☐/☑) can be
 * ticked at any time and save straight away. Formula cells are locked.
 */
export function PlanSheetEditor({
  stage,
  file,
  sheet,
  convertsToXlsx,
}: {
  stage: string;
  file: string;
  sheet: PlanSheetView;
  /** Old .xls: saving turns it into .xlsx. */
  convertsToXlsx: boolean;
}) {
  const t = useT().pages.seasonal;
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [edits, setEdits] = useState<Map<string, string>>(new Map());
  const [ticks, setTicks] = useState<Map<string, boolean>>(new Map());
  const [active, setActive] = useState<{ r: number; c: number } | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();
  const [tickPending, setTickPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  // Moving with Enter/Tab/Esc replaces the input; its blur must not then
  // close the next cell.
  const ignoreBlur = useRef(false);

  // What is drawn: the sheet's own rows/columns, plus blank ones while editing.
  const { rowNumbers, colNumbers, cellAt, covered } = useMemo(() => {
    const cellAt = new Map<string, RenderCell>();
    const covered = new Set<string>();
    for (const row of sheet.rows) {
      for (const cell of row.cells) {
        cellAt.set(`${row.n}:${cell.c}`, cell);
        // Mark what a merged block covers (visible columns only).
        if (cell.cs || cell.rs) {
          const colIdx = sheet.cols.findIndex((col) => col.n === cell.c);
          const rowIdx = sheet.rows.findIndex((r) => r.n === row.n);
          for (let dr = 0; dr < (cell.rs ?? 1); dr++) {
            for (let dc = 0; dc < (cell.cs ?? 1); dc++) {
              if (dr === 0 && dc === 0) continue;
              const rn = sheet.rows[rowIdx + dr]?.n;
              const cn = sheet.cols[colIdx + dc]?.n;
              if (rn && cn) covered.add(`${rn}:${cn}`);
            }
          }
        }
      }
    }
    const lastRow = sheet.rows.at(-1)?.n ?? 0;
    const lastCol = sheet.cols.at(-1)?.n ?? 0;
    const rowNumbers = [...sheet.rows.map((r) => r.n), ...(editing ? Array.from({ length: EXTRA_ROWS }, (_, i) => lastRow + i + 1) : [])];
    const colNumbers = [...sheet.cols.map((c) => c.n), ...(editing ? Array.from({ length: EXTRA_COLS }, (_, i) => lastCol + i + 1) : [])];
    return { rowNumbers, colNumbers, cellAt, covered };
  }, [sheet, editing]);

  const widthOf = (n: number) => sheet.cols.find((c) => c.n === n)?.w ?? DEFAULT_COL;
  const heightOf = (n: number) => sheet.rows.find((r) => r.n === n)?.h ?? DEFAULT_ROW;
  const address = (r: number, c: number) => `${columnName(c)}${r}`;
  const original = (r: number, c: number) => cellAt.get(`${r}:${c}`)?.t ?? "";
  const kindAt = (r: number, c: number) => cellAt.get(`${r}:${c}`)?.k ?? "text";
  const valueAt = (r: number, c: number) => edits.get(address(r, c)) ?? original(r, c);
  const editable = (r: number, c: number) => kindAt(r, c) === "text" && !covered.has(`${r}:${c}`);
  const totalWidth = HEADER_COL + colNumbers.reduce((sum, n) => sum + widthOf(n), 0);

  // Leaving the page with unsaved changes asks first.
  useEffect(() => {
    if (edits.size === 0) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [edits.size]);

  useEffect(() => {
    if (active && input.current) {
      // Cursor at the end, so typing adds to what's there.
      const box = input.current;
      box.focus();
      box.setSelectionRange(box.value.length, box.value.length);
    }
    ignoreBlur.current = false;
  }, [active]);

  function open(r: number, c: number) {
    if (!editing || !editable(r, c)) return;
    setActive({ r, c });
    setDraft(valueAt(r, c));
  }

  function commit() {
    if (!active) return;
    const key = address(active.r, active.c);
    const next = new Map(edits);
    if (draft === original(active.r, active.c)) next.delete(key);
    else next.set(key, draft);
    setEdits(next);
  }

  function move(dr: number, dc: number) {
    if (!active) return;
    ignoreBlur.current = true;
    commit();
    let ri = rowNumbers.indexOf(active.r);
    let ci = colNumbers.indexOf(active.c);
    for (let i = 0; i < rowNumbers.length * colNumbers.length; i++) {
      ri += dr;
      ci += dc;
      if (ri < 0 || ci < 0 || ri >= rowNumbers.length || ci >= colNumbers.length) {
        setActive(null);
        return;
      }
      if (editable(rowNumbers[ri], colNumbers[ci])) break;
    }
    setActive({ r: rowNumbers[ri], c: colNumbers[ci] });
    setDraft(valueAt(rowNumbers[ri], colNumbers[ci]));
  }

  function cancel() {
    if (edits.size > 0 && !window.confirm(t.discardQuestion)) return;
    setEdits(new Map());
    setActive(null);
    setEditing(false);
    setError(null);
  }

  function save() {
    let all = edits;
    if (active) {
      all = new Map(edits);
      const key = address(active.r, active.c);
      if (draft === original(active.r, active.c)) all.delete(key);
      else all.set(key, draft);
    }
    setActive(null);
    setError(null);
    setNotice(null);
    start(async () => {
      const result = await savePlanEditsAction({
        stage,
        file,
        sheet: sheet.name,
        edits: [...all].map(([address, value]) => ({ address, value })),
      });
      if (result.error) {
        setEdits(all);
        return setError(result.error);
      }
      setEdits(new Map());
      setEditing(false);
      setNotice(result.notice ?? null);
      if (result.fileName && result.fileName !== file) {
        router.replace(`/seasonal-plan?stage=${stage}&file=${encodeURIComponent(result.fileName)}#plan-preview`, { scroll: false });
      } else {
        router.refresh();
      }
    });
  }

  /** A checkbox saves on its own, straight away. */
  function tick(r: number, c: number, cell: RenderCell) {
    const key = address(r, c);
    const now = !(ticks.get(key) ?? cell.v ?? false);
    const value = cell.k === "box" ? (now ? "☑" : "☐") : now ? "TRUE" : "FALSE";
    setTicks(new Map(ticks).set(key, now));
    setTickPending(key);
    setError(null);
    setNotice(null);
    void savePlanEditsAction({ stage, file, sheet: sheet.name, edits: [{ address: key, value }] })
      .then((result) => {
        if (result.error) {
          setTicks((prev) => new Map(prev).set(key, !now));
          setError(result.error);
        } else if (result.fileName && result.fileName !== file) {
          router.replace(`/seasonal-plan?stage=${stage}&file=${encodeURIComponent(result.fileName)}#plan-preview`, { scroll: false });
        } else {
          router.refresh();
        }
      })
      .finally(() => setTickPending(null));
  }

  const pendingCount =
    edits.size + (active && draft !== original(active.r, active.c) && !edits.has(address(active.r, active.c)) ? 1 : 0);

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        {!editing ? (
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setNotice(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-forest px-3 py-1.5 text-sm font-semibold text-cream transition hover:opacity-90"
          >
            <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="m4 14.5-.5 2 2-.5 9-9-1.5-1.5-9 9ZM12.5 4l1.5-1.5 1.5 1.5L14 5.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t.edit}
          </button>
        ) : (
          <>
            <button
              type="button"
              // Keep the cell being typed in open, so Save includes it.
              onMouseDown={(e) => e.preventDefault()}
              onClick={save}
              disabled={pending || pendingCount === 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-forest px-3 py-1.5 text-sm font-semibold text-cream transition hover:opacity-90 disabled:opacity-60"
            >
              {pending ? t.savingChanges : t.saveChanges(pendingCount)}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={pending}
              className="rounded-md border-2 border-line px-3 py-1.5 text-sm font-semibold text-ink-muted transition hover:border-leaf hover:text-ink"
            >
              {t.cancelEdit}
            </button>
          </>
        )}
        {notice ? (
          <span role="status" className="text-sm font-medium text-success-ink">
            {notice}
          </span>
        ) : null}
        {error ? (
          <span role="alert" className="text-sm font-medium text-danger-ink">
            {error}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-ink-muted">{editing ? t.editHint : t.tickHint}</p>
      {editing && convertsToXlsx ? <p className="mt-1 text-xs font-medium text-warning-ink">{t.convertNote}</p> : null}

      {/* The sheet itself: white like Excel, whatever the site's theme. */}
      <div className="relative mt-3 max-h-[75vh] overflow-auto rounded-lg border border-[#c8c8c8] bg-white shadow-sm" lang="ar-EG">
        <table
          dir={sheet.rtl ? "rtl" : "ltr"}
          className="border-separate border-spacing-0 text-black"
          style={{
            tableLayout: "fixed",
            width: totalWidth,
            fontFamily: "Calibri, Carlito, 'Noto Sans', 'Noto Sans Arabic', Arial, sans-serif",
            fontSize: "14.667px",
            lineHeight: 1.25,
          }}
        >
          <colgroup>
            <col style={{ width: HEADER_COL }} />
            {colNumbers.map((n) => (
              <col key={n} style={{ width: widthOf(n) }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th aria-hidden className="sticky top-0 z-20 border-b border-e border-[#c8c8c8] bg-[#f2f2f2]" style={{ insetInlineStart: 0 }} />
              {colNumbers.map((n) => (
                <th
                  key={n}
                  scope="col"
                  className="sticky top-0 z-10 border-b border-e border-[#d4d4d4] bg-[#f2f2f2] py-0.5 text-center text-xs font-normal text-[#555]"
                >
                  {columnName(n)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowNumbers.map((r) => (
              <tr key={r} style={{ height: heightOf(r) }}>
                <th
                  scope="row"
                  className="sticky z-10 border-b border-e border-[#d4d4d4] bg-[#f2f2f2] px-1 text-center text-xs font-normal text-[#555]"
                  style={{ insetInlineStart: 0 }}
                >
                  {r}
                </th>
                {colNumbers.map((c, ci) => {
                  if (covered.has(`${r}:${c}`)) return null;
                  const cell = cellAt.get(`${r}:${c}`);
                  const css = (cell ? sheet.styles[cell.s] : {}) as CSSProperties;
                  const addr = address(r, c);
                  const isActive = active?.r === r && active?.c === c;
                  const changed = edits.has(addr);
                  const kind = cell?.k ?? "text";
                  const wraps = css.whiteSpace === "pre-wrap";
                  // Like Excel, text that doesn't wrap runs on into an empty
                  // neighbour; otherwise it is cut at the cell edge.
                  const nextCol = colNumbers[ci + 1];
                  const nextEmpty =
                    nextCol !== undefined &&
                    !covered.has(`${r}:${nextCol}`) &&
                    !valueAt(r, nextCol) &&
                    !(cellAt.get(`${r}:${nextCol}`) && sheet.styles[cellAt.get(`${r}:${nextCol}`)!.s].backgroundColor);
                  const grid = sheet.gridLines ? "1px solid #e1e1e1" : "1px solid transparent";
                  const style: CSSProperties = {
                    borderTop: "none",
                    borderInlineStart: "none",
                    borderBottom: grid,
                    borderInlineEnd: grid,
                    padding: 0,
                    position: "relative",
                    verticalAlign: "bottom",
                    ...css,
                    ...(changed ? { backgroundColor: "#fff4c2" } : {}),
                    ...(isActive ? { outline: "2px solid #377b49", outlineOffset: -2, zIndex: 5 } : {}),
                  };
                  const content = (
                    <div
                      className="px-1"
                      style={{
                        whiteSpace: wraps ? "pre-wrap" : "pre",
                        overflow: wraps || !nextEmpty ? "hidden" : "visible",
                        textOverflow: "clip",
                        textAlign: css.textAlign,
                        minHeight: "1.25em",
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      {valueAt(r, c)}
                    </div>
                  );
                  return (
                    <td
                      key={c}
                      colSpan={cell?.cs}
                      rowSpan={cell?.rs}
                      dir="auto"
                      title={editing && kind === "formula" ? t.formulaLocked : undefined}
                      style={style}
                    >
                      {kind === "bool" || kind === "box" ? (
                        <label className="flex h-full min-h-5 cursor-pointer items-center justify-center">
                          <input
                            type="checkbox"
                            checked={ticks.get(addr) ?? cell?.v ?? false}
                            disabled={tickPending !== null}
                            onChange={() => tick(r, c, cell!)}
                            aria-label={t.editCell(addr)}
                            className="size-4 cursor-pointer accent-[#1e4428]"
                          />
                        </label>
                      ) : isActive ? (
                        <textarea
                          ref={input}
                          dir="auto"
                          aria-label={t.editCell(addr)}
                          value={draft}
                          rows={Math.max(1, Math.min(6, draft.split("\n").length))}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={() => {
                            if (ignoreBlur.current) {
                              ignoreBlur.current = false;
                              return;
                            }
                            commit();
                            setActive(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey && !e.altKey) {
                              e.preventDefault();
                              move(1, 0);
                            } else if (e.key === "Tab") {
                              e.preventDefault();
                              move(0, e.shiftKey ? -1 : 1);
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              ignoreBlur.current = true;
                              setActive(null);
                            }
                          }}
                          className="absolute inset-0 z-10 block min-h-full w-full resize-none bg-white px-1 text-black shadow-lg outline-none"
                          style={{ font: "inherit", minWidth: Math.max(widthOf(c), 140), height: "auto" }}
                        />
                      ) : editing && editable(r, c) ? (
                        <button
                          type="button"
                          onClick={() => open(r, c)}
                          aria-label={`${t.editCell(addr)}: ${valueAt(r, c)}`}
                          className="block h-full w-full text-start hover:bg-[#377b49]/10"
                          style={{ textAlign: css.textAlign, font: "inherit", color: "inherit" }}
                        >
                          {content}
                        </button>
                      ) : (
                        <>
                          {content}
                          {editing && kind === "formula" ? <span aria-hidden className="absolute inset-0 bg-black/5" /> : null}
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sheet.truncated ? <p className="mt-2 text-xs text-ink-muted">{t.truncated(500)}</p> : null}
    </div>
  );
}
