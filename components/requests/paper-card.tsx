import type { ReactNode } from "react";
import type { Paper } from "@/lib/request-papers";
import { getT } from "@/lib/i18n/server";

/**
 * One request paper (committee or event): its name, items, and who changed
 * it last. Shows `editor` instead of the read-only list when the viewer may
 * change it right now.
 */
export async function PaperCard({
  name,
  note,
  paper,
  highlight,
  canEdit,
  emptyText,
  stamp,
  editor,
}: {
  name: string;
  note?: string;
  paper: Paper;
  /** The viewer's own paper (green border). */
  highlight: boolean;
  canEdit: boolean;
  emptyText: string;
  stamp: (iso: string) => string;
  editor: ReactNode;
}) {
  const t = (await getT()).pages.tools;
  return (
    <li
      className={`flex min-w-0 flex-col gap-2 rounded-2xl border-2 bg-surface-raised p-4 ${
        highlight || canEdit ? "border-leaf shadow-md" : "border-line"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg leading-tight text-forest">{name}</h3>
        {canEdit ? (
          <span className="shrink-0 rounded-full bg-sun px-2.5 py-0.5 text-[11px] font-bold text-forest">{t.youEdit}</span>
        ) : null}
      </div>
      {note ? <p className="text-xs text-ink-muted">{note}</p> : null}
      <span className="text-xs text-ink-muted">{paper.items.length > 0 ? t.items(paper.items.length) : t.none}</span>

      {canEdit ? (
        editor
      ) : paper.items.length > 0 ? (
        <ol className="divide-y divide-line/70">
          {paper.items.map((item, i) => (
            <li key={item.id} className="flex items-center gap-2 py-1.5 text-sm">
              <span className="w-5 shrink-0 text-xs text-ink-muted tabular-nums">{i + 1}.</span>
              <bdi className="min-w-0 flex-1 break-words text-ink">{item.name}</bdi>
              {item.quantity ? (
                <span className="shrink-0 rounded-md bg-surface px-1.5 text-xs text-ink-muted tabular-nums" dir="ltr">
                  × {item.quantity}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-ink-subtle">{emptyText}</p>
      )}

      {paper.updatedAt ? (
        <p className="mt-auto border-t border-dashed border-line pt-2 text-[11.5px] text-ink-muted">
          {t.lastEdit(paper.updatedBy, stamp(paper.updatedAt))}
        </p>
      ) : null}
    </li>
  );
}
