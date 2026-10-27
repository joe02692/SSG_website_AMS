"use client";

import { useRef, useState, useTransition } from "react";
import {
  addToolAction,
  copyLastWeekAction,
  moveToolAction,
  removeToolAction,
  type ToolsState,
} from "@/app/seasonal-plan/tools-actions";
import { useT } from "@/lib/i18n/client";

type Item = { id: string; name: string; quantity: number | null };

/**
 * A stage admin's own list (open days only): add, remove, move up/down, and
 * copy last week's items into an empty list. Each change goes to the server
 * at once; the page refreshes with the saved list.
 */
export function ToolsEditor({
  stage,
  items,
  canCopy,
}: {
  stage: string;
  items: Item[];
  /** There is an earlier week to copy from and this week's list is empty. */
  canCopy: boolean;
}) {
  const t = useT().pages.tools;
  const [state, setState] = useState<ToolsState>({});
  const [pending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  function run(action: (prev: ToolsState, data: FormData) => Promise<ToolsState>, fields: Record<string, string>, after?: (r: ToolsState) => void) {
    const data = new FormData();
    data.set("stage", stage);
    for (const [k, v] of Object.entries(fields)) data.set(k, v);
    startTransition(async () => {
      const result = await action({}, data);
      setState(result);
      after?.(result);
    });
  }

  function onAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run(
      addToolAction,
      { name: nameRef.current?.value ?? "", quantity: qtyRef.current?.value ?? "" },
      (result) => {
        // Only a saved item clears the boxes; on an error what was typed stays.
        if (!result.error) {
          if (nameRef.current) nameRef.current.value = "";
          if (qtyRef.current) qtyRef.current.value = "";
          nameRef.current?.focus();
        }
      },
    );
  }

  return (
    <div className="flex flex-col gap-2" aria-busy={pending}>
      {items.length > 0 ? (
        <ol className="divide-y divide-line/70">
          {items.map((item, i) => (
            <li key={item.id} className="flex items-center gap-2 py-1.5 text-sm">
              <span className="w-5 shrink-0 text-xs text-ink-muted tabular-nums">{i + 1}.</span>
              <bdi className="min-w-0 flex-1 break-words text-ink">{item.name}</bdi>
              {item.quantity ? (
                <span className="shrink-0 rounded-md bg-surface px-1.5 text-xs text-ink-muted tabular-nums" dir="ltr">
                  × {item.quantity}
                </span>
              ) : null}
              <span className="flex shrink-0 items-center gap-0.5">
                <IconButton label={t.moveUp(item.name)} disabled={pending || i === 0} onClick={() => run(moveToolAction, { id: item.id, direction: "up" })}>
                  <path d="M10 15V5M5.5 9.5 10 5l4.5 4.5" />
                </IconButton>
                <IconButton label={t.moveDown(item.name)} disabled={pending || i === items.length - 1} onClick={() => run(moveToolAction, { id: item.id, direction: "down" })}>
                  <path d="M10 5v10M5.5 10.5 10 15l4.5-4.5" />
                </IconButton>
                <IconButton label={t.remove(item.name)} danger disabled={pending} onClick={() => run(removeToolAction, { id: item.id })}>
                  <path d="M6 6l8 8M14 6l-8 8" />
                </IconButton>
              </span>
            </li>
          ))}
        </ol>
      ) : canCopy ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(copyLastWeekAction, {})}
          className="rounded-lg border-2 border-dashed border-leaf px-3 py-2 text-sm font-semibold text-forest transition hover:bg-leaf/10 disabled:opacity-60"
        >
          {pending ? t.copying : t.copyLastWeek}
        </button>
      ) : (
        <p className="py-1 text-sm text-ink-muted">{t.none}</p>
      )}

      <form onSubmit={onAdd} className="flex gap-1.5">
        <input
          ref={nameRef}
          name="name"
          maxLength={80}
          required
          dir="auto"
          aria-label={t.addPlaceholder}
          placeholder={t.addPlaceholder}
          className="min-w-0 flex-1 rounded-lg border-2 border-line-strong bg-surface-raised px-2.5 py-1.5 text-sm text-ink outline-none focus:border-forest"
        />
        <input
          ref={qtyRef}
          name="quantity"
          inputMode="numeric"
          maxLength={3}
          dir="ltr"
          aria-label={t.qtyPlaceholder}
          placeholder={t.qtyPlaceholder}
          className="w-14 shrink-0 rounded-lg border-2 border-line-strong bg-surface-raised px-1.5 py-1.5 text-center text-sm text-ink outline-none focus:border-forest"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg bg-forest px-3 text-sm font-bold text-cream transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "…" : t.add}
        </button>
      </form>

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
      className={`grid size-7 place-items-center rounded-full border transition disabled:opacity-30 ${
        danger ? "border-danger-line text-danger-ink hover:bg-danger-surface" : "border-line text-ink-muted hover:border-leaf hover:text-ink"
      }`}
    >
      <svg aria-hidden viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}
