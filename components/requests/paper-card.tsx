import type { ReactNode } from "react";
import type { Paper } from "@/lib/request-papers";
import { getT } from "@/lib/i18n/server";

/**
 * One request paper (committee or event): its name, items, and who changed
 * it last. `editor` is the item list (ToolsEditor), editable or not.
 */
export async function PaperCard({
  name,
  note,
  paper,
  highlight,
  canEdit,
  stamp,
  editor,
}: {
  name: string;
  note?: string;
  paper: Paper;
  /** The viewer's own paper (green border). */
  highlight: boolean;
  canEdit: boolean;
  stamp: (iso: string) => string;
  editor: ReactNode;
}) {
  const t = (await getT()).pages.tools;
  return (
    <li
      className={`flex min-w-0 flex-col gap-3 rounded-2xl border-2 bg-surface-raised p-5 ${
        highlight || canEdit ? "border-leaf shadow-md" : "border-line"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xl leading-tight text-forest">{name}</h3>
        {canEdit ? (
          <span className="shrink-0 rounded-full bg-sun px-2.5 py-0.5 text-[11px] font-bold text-forest">{t.youEdit}</span>
        ) : null}
      </div>
      {note ? <p className="text-xs text-ink-muted">{note}</p> : null}
      <span className="text-xs text-ink-muted">{paper.items.length > 0 ? t.items(paper.items.length) : t.none}</span>

      {editor}

      {paper.updatedAt ? (
        <p className="mt-auto border-t border-dashed border-line pt-2 text-[11.5px] text-ink-muted">
          {t.lastEdit(paper.updatedBy, stamp(paper.updatedAt))}
        </p>
      ) : null}
    </li>
  );
}
