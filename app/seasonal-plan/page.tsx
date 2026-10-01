import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { PageBanner } from "@/components/page-banner";
import { PlanControls } from "@/components/seasonal/plan-controls";
import { requireRole } from "@/lib/dal";
import { STAFF_ROLES } from "@/lib/roles";
import { getObjectBytes } from "@/lib/b2";
import { SCOUT_STAGES } from "@/lib/onboarding";
import { ArchiveDownload } from "@/components/seasonal/archive-download";
import {
  archiveCounts,
  isStageCode,
  listArchive,
  listPlans,
  managedStages,
  readPlanSheets,
  type ArchivedPlan,
  type PlanFile,
  type PlanSheet,
} from "@/lib/seasonal-plans";
import { getLocale, getT } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getT()).pages.seasonal;
  return { title: t.metaTitle, description: t.metaDescription, robots: { index: false } };
}

/**
 * The season plan, for leaders and staff only: one Excel file per stage.
 *
 * Every leader can open and download every stage's plan. The head site admin
 * can add, replace and delete any of them; a stage admin only their own
 * stage's (see lib/seasonal-plans.ts). Scouts are sent to their dashboard,
 * visitors to the login page.
 */
export default async function SeasonalPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; sheet?: string }>;
}) {
  const profile = await requireRole(...STAFF_ROLES);
  const all = await getT();
  const t = all.pages.seasonal;
  const locale = await getLocale();
  const { stage: openStage, sheet: sheetParam } = await searchParams;

  const managed = await managedStages(profile);

  let plans: Record<string, PlanFile> = {};
  let archived: Record<string, number> = {};
  let storageFailed = false;
  const selected = isStageCode(openStage) ? openStage : null;
  let archive: ArchivedPlan[] = [];
  try {
    [plans, archived, archive] = await Promise.all([
      listPlans(),
      archiveCounts(),
      selected ? listArchive(selected) : Promise.resolve([]),
    ]);
  } catch (error) {
    console.error("[seasonal-plan] could not list plans", error);
    storageFailed = true;
  }

  // The plan being read on the page, if one was opened.
  const open = openStage ? plans[openStage] : undefined;
  let sheets: PlanSheet[] | null = null;
  let previewFailed = false;
  if (open) {
    try {
      const bytes = await getObjectBytes(open.key);
      sheets = bytes ? readPlanSheets(bytes) : null;
      if (!sheets) previewFailed = true;
    } catch (error) {
      console.error("[seasonal-plan] could not read the plan", error);
      previewFailed = true;
    }
  }
  const sheetIndex = Math.min(Math.max(Number(sheetParam) || 0, 0), Math.max((sheets?.length ?? 1) - 1, 0));
  const sheet = sheets?.[sheetIndex];

  const date = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(intlLocale(locale), { day: "numeric", month: "short", year: "numeric" })
      : "";

  const managerNote =
    profile.role === "head_site_admin"
      ? t.youManageAll
      : profile.role === "stage_admin"
        ? managed.migrationMissing
          ? t.migrationMissing
          : managed.codes[0]
            ? t.youManage(all.stages[managed.codes[0] as keyof typeof all.stages])
            : t.noAdminStage
        : null;

  return (
    <SiteShell>
      <PageBanner title={t.title} eyebrow={t.eyebrow}>
        {t.intro}
      </PageBanner>

      <div className="mx-auto w-[calc(100%-40px)] max-w-[1100px] py-10 sm:py-14">
        {managerNote ? (
          <div className="mb-6 rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm text-ink">
            <p className="font-semibold text-forest">{managerNote}</p>
            {managed.codes.length > 0 ? <p className="mt-1 text-ink-muted">{t.rules}</p> : null}
          </div>
        ) : null}

        {storageFailed ? (
          <p role="alert" className="mb-6 rounded-lg border border-warning-line bg-warning-surface px-3 py-2.5 text-sm text-warning-ink">
            {t.storageError}
          </p>
        ) : null}

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SCOUT_STAGES.map((stage, i) => {
            const plan = plans[stage.value];
            const name = all.stages[stage.value as keyof typeof all.stages];
            const isOpen = open?.stage === stage.value;
            return (
              <li
                key={stage.value}
                className={`flex flex-col rounded-2xl border-2 bg-surface-raised p-4 ${
                  isOpen ? "border-leaf shadow-md" : "border-line"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-forest text-xs font-bold text-sun">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 className="text-lg leading-tight text-forest">{name}</h2>
                </div>

                <div className="mt-3 flex-1 text-sm">
                  {plan ? (
                    <>
                      <p className="flex items-center gap-2 font-medium text-ink">
                        <ExcelIcon />
                        <bdi className="min-w-0 truncate">{plan.originalName ?? `${name}.${plan.ext}`}</bdi>
                      </p>
                      <p className="mt-1 text-xs text-ink-muted">
                        {t.updated(date(plan.updatedAt))}
                        {plan.uploadedBy ? (
                          <>
                            {" "}
                            {t.by} <bdi>{plan.uploadedBy}</bdi>
                          </>
                        ) : null}{" "}
                        · <bdi>{t.size(plan.size)}</bdi>
                      </p>
                    </>
                  ) : (
                    <p className="text-ink-subtle">{t.noPlan}</p>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  {plan ? (
                    <Link
                      href={`/seasonal-plan?stage=${stage.value}#plan-preview`}
                      scroll={false}
                      className="inline-flex w-full items-center justify-center rounded-md bg-sun px-3 py-2 text-sm font-bold text-forest transition hover:opacity-85"
                    >
                      {t.open}
                    </Link>
                  ) : null}
                  {archived[stage.value] ? (
                    <Link
                      href={`/seasonal-plan?stage=${stage.value}#plan-archive`}
                      scroll={false}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:border-leaf hover:text-ink"
                    >
                      <ArchiveIcon />
                      {t.archiveLink(archived[stage.value])}
                    </Link>
                  ) : null}
                  <PlanControls
                    stage={stage.value}
                    hasPlan={Boolean(plan)}
                    canManage={managed.codes.includes(stage.value)}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        {/* ------------------------------------------------------ The open plan */}
        {open ? (
          <section id="plan-preview" aria-labelledby="plan-preview-heading" className="mt-10 scroll-mt-24">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="plan-preview-heading" className="text-[clamp(20px,3vw,26px)] text-maroon">
                {t.previewTitle(all.stages[open.stage as keyof typeof all.stages])}
              </h2>
              <Link
                href="/seasonal-plan"
                scroll={false}
                className="rounded-md border-2 border-line px-3 py-1.5 text-sm font-semibold text-ink-muted transition hover:border-leaf hover:text-ink"
              >
                {t.closePreview}
              </Link>
            </div>

            {open.ext === "xlsm" ? (
              <p className="mt-3 rounded-lg border border-warning-line bg-warning-surface px-3 py-2 text-sm text-warning-ink">
                {t.macroNote}
              </p>
            ) : null}

            {previewFailed || !sheet ? (
              <p className="mt-4 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink-muted">
                {t.previewFailed}
              </p>
            ) : (
              <>
                {sheets && sheets.length > 1 ? (
                  <nav aria-label={t.sheets} className="mt-4 flex flex-wrap gap-2">
                    {sheets.map((s, i) => (
                      <Link
                        key={`${s.name}-${i}`}
                        href={`/seasonal-plan?stage=${open.stage}&sheet=${i}#plan-preview`}
                        scroll={false}
                        aria-current={i === sheetIndex ? "page" : undefined}
                        className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                          i === sheetIndex ? "bg-forest text-cream" : "border border-line bg-surface-raised text-ink-muted hover:border-leaf"
                        }`}
                      >
                        <bdi>{s.name}</bdi>
                      </Link>
                    ))}
                  </nav>
                ) : null}

                {sheet.rows.length === 0 ? (
                  <p className="mt-4 text-sm text-ink-muted">{t.emptySheet}</p>
                ) : (
                  <div className="relative mt-4 max-h-[75vh] overflow-auto rounded-xl border border-line bg-surface-raised">
                    {/* Laid out the way the sheet is set in Excel: right-to-left
                        sheets stay right-to-left whatever language the site is in. */}
                    <table dir={sheet.rtl ? "rtl" : "ltr"} className="min-w-full border-collapse text-sm">
                      <tbody>
                        {sheet.rows.map((row, r) => (
                          <tr key={r} className={r === 0 ? undefined : "even:bg-surface/60"}>
                            {row.map((cell, c) => (
                              <td
                                key={c}
                                dir="auto"
                                className={`min-w-[7rem] max-w-[22rem] border border-line/70 px-3 py-2 align-top whitespace-pre-wrap text-start ${
                                  r === 0 ? "sticky top-0 z-10 bg-butter font-bold text-forest" : ""
                                }`}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {sheet.truncated ? <p className="mt-2 text-xs text-ink-muted">{t.truncated(500)}</p> : null}
              </>
            )}
          </section>
        ) : null}

        {/* ------------------------------------------- Earlier plans (archive) */}
        {selected && archive.length > 0 ? (
          <section id="plan-archive" aria-labelledby="plan-archive-heading" className="mt-10 scroll-mt-24">
            <h2 id="plan-archive-heading" className="flex items-center gap-2 text-[clamp(18px,2.6vw,22px)] text-maroon">
              <ArchiveIcon />
              {t.archiveTitle(all.stages[selected as keyof typeof all.stages])}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">{t.archiveIntro}</p>
            <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-raised">
              {archive.map((file) => (
                <li key={file.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <ExcelIcon />
                  <span className="min-w-0 flex-1">
                    <bdi className="block truncate text-sm font-medium text-ink">{file.name}</bdi>
                    <span className="block text-xs text-ink-muted">
                      {t.archivedOn(date(file.archivedAt))} · <bdi>{t.size(file.size)}</bdi>
                    </span>
                  </span>
                  <ArchiveDownload stage={selected} fileKey={file.key} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </SiteShell>
  );
}

function ArchiveIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
      <rect x="2.5" y="3.5" width="15" height="4" rx="1" />
      <path d="M4 7.5v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-8M8 11h4" strokeLinecap="round" />
    </svg>
  );
}

function ExcelIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="size-5 shrink-0">
      <rect x="2" y="2" width="16" height="16" rx="3" fill="#1d6f42" />
      <path d="m6.5 6 7 8m0-8-7 8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
