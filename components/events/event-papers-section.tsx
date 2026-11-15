import { SCOUT_STAGES } from "@/lib/onboarding";
import { EVENTS_TIMEZONE, type SiteEvent } from "@/lib/events";
import {
  GENERAL_PAPER,
  eventRequestWindow,
  type Paper,
} from "@/lib/request-papers";
import { addPaperItemAction, movePaperItemAction, removePaperItemAction, updatePaperNoteAction } from "@/app/requests/actions";
import { ToolsEditor } from "@/components/seasonal/tools-editor";
import { PaperCard } from "@/components/requests/paper-card";
import { getLocale, getT } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/config";

/**
 * Leaders only: the tools each stage (and the group in general) needs for
 * each upcoming event (migration 0028). Every leader sees every paper. A
 * stage's paper is edited by its stage admins; the general paper by any
 * leader. Open from 10 days before the event until 24 hours before it.
 */
export async function EventPapersSection({
  events,
  papers,
  editable,
  canSetSource = false,
}: {
  events: SiteEvent[];
  papers: Record<string, Record<string, Paper>>;
  /** Paper keys this leader may edit: own stage(s) + "general". */
  editable: string[];
  /** Tools & logistics committee + head admin: the مخزن / قاعة / مشتريات dropdown. */
  canSetSource?: boolean;
}) {
  const all = await getT();
  const t = all.features.eventPapers;
  const locale = await getLocale();
  const stamp = (iso: string) =>
    new Date(iso).toLocaleString(intlLocale(locale), {
      timeZone: EVENTS_TIMEZONE,
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "numeric",
      minute: "2-digit",
    });
  const actions = { add: addPaperItemAction, remove: removePaperItemAction, move: movePaperItemAction, note: updatePaperNoteAction };
  const keys = [GENERAL_PAPER, ...SCOUT_STAGES.map((s) => s.value)];

  return (
    <section id="event-requests" aria-labelledby="event-requests-heading" className="mt-14 scroll-mt-24">
      <div className="rounded-3xl border-2 border-dashed border-leaf bg-leaf/5 p-5 sm:p-7">
        <p className="flex w-fit items-center gap-1.5 rounded-full bg-forest px-3 py-1 text-xs font-bold text-sun">
          <svg aria-hidden viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="4" y="9" width="12" height="8" rx="1.5" />
            <path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
          </svg>
          {t.leadersOnly}
        </p>
        <h2 id="event-requests-heading" className="mt-3 text-[clamp(20px,3vw,26px)] text-maroon">
          {t.title}
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-ink-muted">{t.intro}</p>

        {events.length === 0 ? <p className="mt-4 text-sm text-ink-muted">{t.noEvents}</p> : null}

        <div className="mt-5 space-y-4">
          {events.map((event) => {
            const window = eventRequestWindow(event.startsAt);
            const open = window.state === "open";
            const eventPapers = papers[event.id] ?? {};
            const total = keys.reduce((n, key) => n + (eventPapers[key]?.items.length ?? 0), 0);
            return (
              <details key={event.id} open={open} className="group rounded-2xl border border-line bg-surface-raised">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-2 p-4 [&::-webkit-details-marker]:hidden">
                  <span aria-hidden className="text-ink-muted transition group-open:rotate-90 rtl:-scale-x-100 rtl:group-open:rotate-90">
                    ▸
                  </span>
                  <span className="min-w-0 flex-1 font-display text-lg font-semibold text-forest">
                    <bdi>{event.title}</bdi>
                  </span>
                  <span className="text-xs text-ink-muted">{t.items(total)}</span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      open
                        ? "bg-success-surface text-success-ink"
                        : window.state === "before"
                          ? "bg-surface text-ink-muted"
                          : "bg-warning-surface text-warning-ink"
                    }`}
                  >
                    {open ? t.openUntil(stamp(window.closesAt)) : window.state === "before" ? t.opensOn(stamp(window.opensAt)) : t.closed}
                  </span>
                </summary>

                <ul className="grid gap-5 border-t border-line p-4 lg:grid-cols-2">
                  {keys.map((key) => {
                    const paper = eventPapers[key] ?? { items: [], updatedAt: null, updatedBy: null };
                    const mine = editable.includes(key);
                    const name = key === GENERAL_PAPER ? t.general : all.stages[key as keyof typeof all.stages];
                    return (
                      <PaperCard
                        key={key}
                        name={name}
                        note={key === GENERAL_PAPER ? t.generalNote : undefined}
                        paper={paper}
                        highlight={mine && key !== GENERAL_PAPER}
                        canEdit={mine && open}
                        stamp={stamp}
                        editor={
                          <ToolsEditor
                            stage={key}
                            items={paper.items}
                            canEdit={mine && open}
                            canSetSource={canSetSource}
                            list="request_items"
                            emptyText={t.empty}
                            actions={actions}
                            fields={{ kind: "event", event: event.id }}
                          />
                        }
                      />
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </div>
      </div>
    </section>
  );
}
