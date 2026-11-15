"use client";

import { useRef, useState, useTransition } from "react";
import {
  addToolAction,
  copyLastWeekAction,
  moveToolAction,
  removeToolAction,
  updateToolNoteAction,
  type ToolsState,
} from "@/app/seasonal-plan/tools-actions";
import { setItemSourceAction } from "@/app/requests/source-actions";
import { useT } from "@/lib/i18n/client";

type Source = "store" | "hall" | "purchase";
export type ListItem = { id: string; name: string; quantity: number | null; notes: string | null; source: Source | null };
type Action = (prev: ToolsState, data: FormData) => Promise<ToolsState>;

/** The server actions a list uses. Default: the weekly stage tools (0026). */
export type ListActions = { add: Action; remove: Action; move: Action; note: Action; copy?: Action };

const STAGE_TOOLS: ListActions = {
  add: addToolAction,
  remove: removeToolAction,
  move: moveToolAction,
  note: updateToolNoteAction,
  copy: copyLastWeekAction,
};

const SOURCES: Source[] = ["store", "hall", "purchase"];

/**
 * One paper's items, used for every paper: the weekly stage tools (0026),
 * committee papers and event papers (0028).
 *
 * Each row: number · name · notes · how many · where it comes from.
 *  - `canEdit` (the paper's editors, while it's open): add, remove, move,
 *    write notes, copy last week into an empty list.
 *  - `canSetSource` (Tools & logistics committee + head admin, any time):
 *    the مخزن / قاعة / مشتريات dropdown. Everyone else sees the choice as a
 *    label. Rows that come from the store or the hall are dimmed — they're
 *    covered; what's left to buy stands out.
 */
export function ToolsEditor({
  stage,
  items,
  canEdit = true,
  canCopy = false,
  canSetSource = false,
  list = "stage_tools",
  actions = STAGE_TOOLS,
  fields = {},
  emptyText,
}: {
  stage: string;
  items: ListItem[];
  canEdit?: boolean;
  /** There is an earlier week to copy from and this week's list is empty. */
  canCopy?: boolean;
  canSetSource?: boolean;
  /** Which table the rows live in, for the source dropdown. */
  list?: "stage_tools" | "request_items";
  actions?: ListActions;
  /** Extra form fields sent with every change (e.g. kind, event). */
  fields?: Record<string, string>;
  /** Shown instead of the list when it's empty and can't be edited. */
  emptyText?: string;
}) {
  const t = useT().pages.tools;
  const [state, setState] = useState<ToolsState>({});
  const [pending, startTransition] = useTransition();
  const [editingNote, setEditingNote] = useState<string | null>(null);
  // Sources change instantly on screen; the saved value replaces it on refresh.
  const [sourceDraft, setSourceDraft] = useState<Record<string, Source | null>>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLInputElement>(null);

  function run(action: Action, values: Record<string, string>, after?: (r: ToolsState) => void) {
    const data = new FormData();
    for (const [k, v] of Object.entries(fields)) data.set(k, v);
    data.set("stage", stage);
    for (const [k, v] of Object.entries(values)) data.set(k, v);
    startTransition(async () => {
      const result = await action({}, data);
      setState(result);
      after?.(result);
    });
  }

  function onAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run(
      actions.add,
      {
        name: nameRef.current?.value ?? "",
        quantity: qtyRef.current?.value ?? "",
        notes: notesRef.current?.value ?? "",
      },
      (result) => {
        // Only a saved item clears the boxes; on an error what was typed stays.
        if (!result.error) {
          for (const ref of [nameRef, qtyRef, notesRef]) if (ref.current) ref.current.value = "";
          nameRef.current?.focus();
        }
      },
    );
  }

  function saveNote(id: string, value: string) {
    setEditingNote(null);
    run(actions.note, { id, notes: value });
  }

  function setSource(id: string, value: string) {
    const next = (value || null) as Source | null;
    setSourceDraft((d) => ({ ...d, [id]: next }));
    const data = new FormData();
    data.set("list", list);
    data.set("id", id);
    data.set("source", value);
    startTransition(async () => {
      const result = await setItemSourceAction({}, data);
      setState(result);
      if (result.error)
        setSourceDraft((d) => {
          const rest = { ...d };
          delete rest[id];
          return rest;
        });
    });
  }

  const sourceLabel = (s: Source) => t.sources[s];

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      {items.length > 0 ? (
        <ol className="flex flex-col gap-1.5">
          {items.map((item, i) => {
            const source = item.id in sourceDraft ? sourceDraft[item.id] : item.source;
            const covered = source === "store" || source === "hall";
            return (
              <li
                key={item.id}
                className={`rounded-xl border px-3 py-2.5 transition-colors ${
                  covered ? "border-transparent bg-forest/[0.09] text-ink-muted" : "border-line/80 bg-surface-raised text-ink"
                }`}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="w-6 shrink-0 text-sm font-semibold text-ink-muted tabular-nums">{i + 1}.</span>
                  <bdi className={`min-w-0 flex-1 break-words text-[15px] font-semibold ${covered ? "text-ink-muted" : "text-ink"}`}>
                    {item.name}
                  </bdi>
                  {item.quantity ? (
                    <span className="shrink-0 rounded-lg bg-surface px-2 py-0.5 text-sm font-bold text-forest tabular-nums" dir="ltr">
                      × {item.quantity}
                    </span>
                  ) : null}

                  {canSetSource ? (
                    <select
                      aria-label={t.sourceFor(item.name)}
                      value={source ?? ""}
                      disabled={pending}
                      onChange={(e) => setSource(item.id, e.currentTarget.value)}
                      className={`shrink-0 rounded-lg border-2 px-2 py-1 text-sm font-semibold outline-none focus:border-forest ${
                        source ? (covered ? "border-forest/30 bg-forest/10 text-forest" : "border-sun bg-sun/25 text-forest") : "border-line-strong bg-surface-raised text-ink-muted"
                      }`}
                    >
                      <option value="">{t.sourceNone}</option>
                      {SOURCES.map((s) => (
                        <option key={s} value={s}>
                          {sourceLabel(s)}
                        </option>
                      ))}
                    </select>
                  ) : source ? (
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        covered ? "bg-forest/15 text-forest" : "bg-sun/40 text-forest"
                      }`}
                    >
                      {sourceLabel(source)}
                    </span>
                  ) : null}

                  {canEdit ? (
                    <span className="flex shrink-0 items-center gap-1">
                      <IconButton label={t.editNote(item.name)} disabled={pending} onClick={() => setEditingNote(editingNote === item.id ? null : item.id)}>
                        <path d="M4 14.5V16h1.5L14 7.5 12.5 6 4 14.5ZM12.5 6 14 4.5 15.5 6 14 7.5" />
                      </IconButton>
                      <IconButton label={t.moveUp(item.name)} disabled={pending || i === 0} onClick={() => run(actions.move, { id: item.id, direction: "up" })}>
                        <path d="M10 15V5M5.5 9.5 10 5l4.5 4.5" />
                      </IconButton>
                      <IconButton label={t.moveDown(item.name)} disabled={pending || i === items.length - 1} onClick={() => run(actions.move, { id: item.id, direction: "down" })}>
                        <path d="M10 5v10M5.5 10.5 10 15l4.5-4.5" />
                      </IconButton>
                      <IconButton label={t.remove(item.name)} danger disabled={pending} onClick={() => run(actions.remove, { id: item.id })}>
                        <path d="M6 6l8 8M14 6l-8 8" />
                      </IconButton>
                    </span>
                  ) : null}
                </div>

                {editingNote === item.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveNote(item.id, String(new FormData(e.currentTarget).get("notes") ?? ""));
                    }}
                    className="mt-2 flex gap-1.5 ps-9"
                  >
                    <input
                      name="notes"
                      autoFocus
                      maxLength={200}
                      dir="auto"
                      defaultValue={item.notes ?? ""}
                      aria-label={t.notesFor(item.name)}
                      placeholder={t.notesPlaceholder}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setEditingNote(null);
                      }}
                      className="min-w-0 flex-1 rounded-lg border-2 border-line-strong bg-surface-raised px-2.5 py-1.5 text-sm text-ink outline-none focus:border-forest"
                    />
                    <button type="submit" disabled={pending} className="shrink-0 rounded-lg bg-forest px-3 text-sm font-bold text-cream disabled:opacity-60">
                      {t.saveNote}
                    </button>
                  </form>
                ) : item.notes ? (
                  <p className="mt-1 flex gap-1.5 ps-9 text-sm text-ink-muted">
                    <span aria-hidden className="text-leaf">✎</span>
                    <bdi className="min-w-0 break-words">{item.notes}</bdi>
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : canEdit && canCopy && actions.copy ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => actions.copy && run(actions.copy, {})}
          className="rounded-xl border-2 border-dashed border-leaf px-3 py-3 text-sm font-semibold text-forest transition hover:bg-leaf/10 disabled:opacity-60"
        >
          {pending ? t.copying : t.copyLastWeek}
        </button>
      ) : canEdit ? null : (
        <p className="py-1 text-sm text-ink-subtle">{emptyText ?? t.none}</p>
      )}

      {canEdit ? (
        <form onSubmit={onAdd} className="grid grid-cols-[1fr_4.5rem_auto] gap-1.5 rounded-xl bg-surface p-2 sm:grid-cols-[1.3fr_1fr_4.5rem_auto]">
          <input
            ref={nameRef}
            name="name"
            maxLength={80}
            required
            dir="auto"
            aria-label={t.addPlaceholder}
            placeholder={t.addPlaceholder}
            className="col-span-3 min-w-0 rounded-lg border-2 border-line-strong bg-surface-raised px-2.5 py-2 text-[15px] text-ink outline-none focus:border-forest sm:col-span-1"
          />
          <input
            ref={notesRef}
            name="notes"
            maxLength={200}
            dir="auto"
            aria-label={t.notesPlaceholder}
            placeholder={t.notesPlaceholder}
            className="min-w-0 rounded-lg border-2 border-line-strong bg-surface-raised px-2.5 py-2 text-sm text-ink outline-none focus:border-forest"
          />
          <input
            ref={qtyRef}
            name="quantity"
            inputMode="numeric"
            maxLength={3}
            dir="ltr"
            aria-label={t.qtyPlaceholder}
            placeholder={t.qtyPlaceholder}
            className="min-w-0 rounded-lg border-2 border-line-strong bg-surface-raised px-1.5 py-2 text-center text-[15px] text-ink outline-none focus:border-forest"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-forest px-4 text-sm font-bold text-cream transition hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "…" : t.add}
          </button>
        </form>
      ) : null}

      <p aria-live="polite" className="min-h-4 text-xs">
        {state.error ? <span role="alert" className="text-danger-ink">{state.error}</span> : null}
        {!state.error && state.notice ? <span className="text-success-ink">{state.notice}</span> : null}
      </p>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid size-8 place-items-center rounded-full border transition disabled:opacity-30 ${
        danger ? "border-danger-line text-danger-ink hover:bg-danger-surface" : "border-line text-ink-muted hover:border-leaf hover:text-ink"
      }`}
    >
      <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}
