import { SCOUT_STAGES } from "@/lib/onboarding";
import { getWeekTools, toolsWindow, TOOLS_TIMEZONE } from "@/lib/stage-tools";
import { getLocale, getT } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/config";
import { ToolsEditor } from "@/components/seasonal/tools-editor";

/**
 * "أدوات كل اجتماع" on the Seasonal Plan page (migration 0026): one card per
 * stage with this week's list. Every leader sees all of them; a stage admin's
 * own card (any card for the head admin) can be changed Saturday → Wednesday.
 */
export async function StageToolsSection({ editable }: { editable: string[] }) {
  const all = await getT();
  const t = all.pages.tools;
  const locale = await getLocale();
  const window = toolsWindow();
  const { byStage, hasLastWeek, missing } = await getWeekTools(window.weekStart);

  // Dates are calendar days, so format them at noon UTC to avoid any shift.
  const day = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(intlLocale(locale), { day: "numeric", month: "long" });
  const stamp = (iso: string) =>
    new Date(iso).toLocaleString(intlLocale(locale), {
      timeZone: TOOLS_TIMEZONE,
      weekday: "long",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <section id="meeting-tools" aria-labelledby="meeting-tools-heading" className="mt-12 scroll-mt-24">
      <h2 id="meeting-tools-heading" className="text-[clamp(20px,3vw,26px)] text-maroon">
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
            <span>{t.weekOf(day(window.weekStart))}</span>
            <span aria-hidden>·</span>
            <span>{window.open ? t.openUntil(day(window.closesOn)) : t.closedUntil(day(window.nextWeek))}</span>
          </p>

          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SCOUT_STAGES.map((stage) => {
              const list = byStage[stage.value] ?? { items: [], updatedAt: null, updatedBy: null };
              const mine = editable.includes(stage.value);
              const canEdit = mine && window.open;
              const name = all.stages[stage.value as keyof typeof all.stages];
              return (
                <li
                  key={stage.value}
                  className={`flex min-w-0 flex-col gap-2 rounded-2xl border-2 bg-surface-raised p-4 ${
                    mine ? "border-leaf shadow-md" : "border-line"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg leading-tight text-forest">{name}</h3>
                    {canEdit ? (
                      <span className="shrink-0 rounded-full bg-sun px-2.5 py-0.5 text-[11px] font-bold text-forest">
                        {t.youEdit}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs text-ink-muted">
                    {list.items.length > 0 ? t.items(list.items.length) : t.none}
                  </span>

                  {canEdit ? (
                    <ToolsEditor
                      stage={stage.value}
                      items={list.items.map(({ id, name: itemName, quantity }) => ({ id, name: itemName, quantity }))}
                      canCopy={list.items.length === 0 && Boolean(hasLastWeek[stage.value])}
                    />
                  ) : list.items.length > 0 ? (
                    <ol className="divide-y divide-line/70">
                      {list.items.map((item, i) => (
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
                    <p className="text-sm text-ink-subtle">{t.noneBody}</p>
                  )}

                  {list.updatedAt ? (
                    <p className="mt-auto border-t border-dashed border-line pt-2 text-[11.5px] text-ink-muted">
                      {t.lastEdit(list.updatedBy, stamp(list.updatedAt))}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
