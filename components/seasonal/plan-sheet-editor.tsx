"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePlanEditsAction } from "@/app/seasonal-plan/actions";
import { useT } from "@/lib/i18n/client";

/** 0 → "A", 25 → "Z", 26 → "AA" … */
function columnName(index: number): string {
  let n = index + 1;
  let name = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    name = String.fromCharCode(65 + r) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

const EXTRA_ROWS = 5; // blank rows offered at the bottom while editing
const EXTRA_COLS = 1;

/**
 * One sheet of a seasonal plan, shown as a table — and, for every leader,
 * editable in place (5 Nov 2026): click a cell, type, press Save. Only the
 * changed cells are sent; the server writes them into the file as it is at
 * that moment (app/seasonal-plan/actions.ts → lib/plan-edit.ts).
 *
 * One input exists at a time (the cell being edited), so even a 500-row
 * sheet stays light. Formula cells are shown but locked.
 */
export function PlanSheetEditor({
  stage,
  file,
  sheetName,
  rows,
  formulas,
  originRow,
  originCol,
  rtl,
  convertsToXlsx,
}: {
  stage: string;
  file: string;
  sheetName: string;
  rows: string[][];
  formulas: boolean[][];
  originRow: number;
  originCol: number;
  rtl: boolean;
  /** .xls / .xlsm: saving turns it into .xlsx. */
  convertsToXlsx: boolean;
}) {
  const t = useT().pages.seasonal;
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [edits, setEdits] = useState<Map<string, string>>(new Map());
  const [active, setActive] = useState<{ r: number; c: number } | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  // Moving with Enter/Tab/Esc replaces the input; its blur must not then
  // close the next cell.
  const ignoreBlur = useRef(false);

  const width = rows.reduce((max, row) => Math.max(max, row.length), 0) + (editing ? EXTRA_COLS : 0);
  const height = rows.length + (editing ? EXTRA_ROWS : 0);
  const address = (r: number, c: number) => `${columnName(originCol + c)}${originRow + r + 1}`;
  const original = (r: number, c: number) => rows[r]?.[c] ?? "";
  const isFormula = (r: number, c: number) => Boolean(formulas[r]?.[c]);
  const valueAt = (r: number, c: number) => edits.get(address(r, c)) ?? original(r, c);

  // Leaving the page with unsaved changes asks first.
  useEffect(() => {
    if (edits.size === 0) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
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
    // Whatever blur came from the old input has happened by now.
    ignoreBlur.current = false;
  }, [active]);

  function open(r: number, c: number) {
    if (!editing || isFormula(r, c) || r >= height || c >= width) return;
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
    let { r, c } = active;
    // Skip locked formula cells in the direction of travel.
    for (let i = 0; i < width * height; i++) {
      r += dr;
      c += dc;
      if (r < 0 || c < 0 || r >= height || c >= width) {
        setActive(null);
        return;
      }
      if (!isFormula(r, c)) break;
    }
    setActive({ r, c });
    setDraft(valueAt(r, c));
  }

  function cancel() {
    if (edits.size > 0 && !window.confirm(t.discardQuestion)) return;
    setEdits(new Map());
    setActive(null);
    setEditing(false);
    setError(null);
  }

  function save() {
    // Include the cell still being typed in.
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
        sheet: sheetName,
        edits: [...all].map(([address, value]) => ({ address, value })),
      });
      if (result.error) {
        setEdits(all);
        return setError(result.error);
      }
      setEdits(new Map());
      setEditing(false);
      setNotice(result.notice ?? null);
      // An .xls/.xlsm saved as .xlsx has a new name: follow it.
      if (result.fileName && result.fileName !== file) {
        router.replace(`/seasonal-plan?stage=${stage}&file=${encodeURIComponent(result.fileName)}#plan-preview`, { scroll: false });
      } else {
        router.refresh();
      }
    });
  }

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
              disabled={pending || (edits.size === 0 && !active)}
              className="inline-flex items-center gap-1.5 rounded-md bg-forest px-3 py-1.5 text-sm font-semibold text-cream transition hover:opacity-90 disabled:opacity-60"
            >
              {pending ? t.savingChanges : t.saveChanges(edits.size + (active && draft !== original(active.r, active.c) && !edits.has(address(active.r, active.c)) ? 1 : 0))}
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
      {editing ? (
        <div className="mt-2 space-y-1 text-xs text-ink-muted">
          <p>{t.editHint}</p>
          {convertsToXlsx ? <p className="font-medium text-warning-ink">{t.convertNote}</p> : null}
        </div>
      ) : null}

      {height === 0 && !editing ? (
        <p className="mt-4 text-sm text-ink-muted">{t.emptySheet}</p>
      ) : (
        <div className="relative mt-3 max-h-[75vh] overflow-auto rounded-xl border border-line bg-surface-raised">
          {/* Laid out the way the sheet is set in Excel: right-to-left sheets
              stay right-to-left whatever language the site is in. */}
          <table dir={rtl ? "rtl" : "ltr"} className="min-w-full border-collapse text-sm">
            <tbody>
              {Array.from({ length: height }, (_, r) => (
                <tr key={r} className={r === 0 ? undefined : "even:bg-surface/60"}>
                  {Array.from({ length: width }, (_, c) => {
                    const addr = address(r, c);
                    const locked = isFormula(r, c);
                    const changed = edits.has(addr);
                    const isActive = active?.r === r && active?.c === c;
                    const header = r === 0 && !editing;
                    return (
                      <td
                        key={c}
                        dir="auto"
                        title={editing && locked ? t.formulaLocked : undefined}
                        className={`relative min-w-[7rem] max-w-[22rem] border border-line/70 align-top whitespace-pre-wrap text-start ${
                          header ? "sticky top-0 z-10 bg-butter font-bold text-forest" : ""
                        } ${r === 0 && editing ? "bg-butter/70 font-bold text-forest" : ""} ${
                          editing && locked ? "bg-line/40 text-ink-muted" : ""
                        } ${changed ? "bg-sun/25" : ""} ${isActive ? "outline-2 -outline-offset-2 outline-leaf" : ""}`}
                      >
                        {isActive ? (
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
                                // Tab follows the reading direction of the sheet.
                                move(0, e.shiftKey ? -1 : 1);
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                ignoreBlur.current = true;
                                setActive(null);
                              }
                            }}
                            className="block w-full resize-none bg-white px-3 py-2 text-sm text-ink outline-none"
                          />
                        ) : editing && !locked ? (
                          <button
                            type="button"
                            onClick={() => open(r, c)}
                            aria-label={`${t.editCell(addr)}: ${valueAt(r, c)}`}
                            className="block min-h-9 w-full px-3 py-2 text-start hover:bg-leaf/10"
                          >
                            {valueAt(r, c)}
                          </button>
                        ) : (
                          <span className="block px-3 py-2">{valueAt(r, c)}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
