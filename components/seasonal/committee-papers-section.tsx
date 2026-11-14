import { toolsWindow, TOOLS_TIMEZONE } from "@/lib/stage-tools";
import { COMMITTEE_CODES, getCommitteePapers } from "@/lib/request-papers";
import {
  addPaperItemAction,
  copyCommitteeWeekAction,
  movePaperItemAction,
  removePaperItemAction,
} from "@/app/requests/actions";
import { ToolsEditor } from "@/components/seasonal/tools-editor";
import { PaperCard } from "@/components/requests/paper-card";
import { getLocale, getT } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/config";

/**
 * Committee paper requests on the Seasonal Plan page (migration 0028): one
 * paper per leader committee per week. Every leader sees all of them; the
 * committee's own members (and the head admin) change theirs, Saturday →
 * Wednesday — the same week as the stage tools above.
 */
export async function CommitteePapersSection({ editable }: { editable: string[] }) {
  const all = await getT();
  const t = all.features.committeePapers;
  const tt = all.pages.tools;
  const locale = await getLocale();
  const window = toolsWindow();
  const { byKey, hasLastWeek, missing } = await getCommitteePapers(window.weekStart);

  const day = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(intlLocale(locale), { day: "numeric", month: "long" });
  const stamp = (iso: string) =>
    new Date(iso).toLocaleString(intlLocale(locale), {
      timeZone: TOOLS_TIMEZONE,
      weekday: "long",
      hour: "numeric",
      minute: "2-digit",
    });
  const actions = {
    add: addPaperItemAction,
    remove: removePaperItemAction,
    move: movePaperItemAction,
    copy: copyCommitteeWeekAction,
  };

  return (
    <section id="committee-papers" aria-labelledby="committee-papers-heading" className="mt-12 scroll-mt-24">
      <h2 id="committee-papers-heading" className="text-[clamp(20px,3vw,26px)] text-maroon">
        {t.title}
      </h2>
      <p className="mt-1 max-w-3xl text-sm text-ink-muted">{t.intro}</p>

      {missing ? (
        <p className="mt-4 rounded-lg border border-warning-line bg-warning-surface px-3 py-2.5 text-sm text-warning-ink">
          {t.missing}
        </p>
      ) : (
        <>
          <p
            className={`mt-4 inline-flex flex-wrap items-center gap-x-2 rounded-xl px-3 py-2 text-sm font-semibold ${
              window.open
                ? "border border-success-line bg-success-surface text-success-ink"
                : "border border-warning-line bg-warning-surface text-warning-ink"
            }`}
          >
            <span>{tt.weekOf(day(window.weekStart))}</span>
            <span aria-hidden>·</span>
            <span>{window.open ? tt.openUntil(day(window.closesOn)) : tt.closedUntil(day(window.nextWeek))}</span>
          </p>

          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {COMMITTEE_CODES.map((code) => {
              const paper = byKey[code] ?? { items: [], updatedAt: null, updatedBy: null };
              const mine = editable.includes(code);
              return (
                <PaperCard
                  key={code}
                  name={t.name(all.members.leaders.committeeNames[code] ?? code)}
                  paper={paper}
                  highlight={mine}
                  canEdit={mine && window.open}
                  emptyText={t.empty}
                  stamp={stamp}
                  editor={
                    <ToolsEditor
                      stage={code}
                      items={paper.items}
                      canCopy={paper.items.length === 0 && Boolean(hasLastWeek[code])}
                      actions={actions}
                      fields={{ kind: "committee" }}
                    />
                  }
                />
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
