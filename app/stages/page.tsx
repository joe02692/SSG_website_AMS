import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { PageBanner } from "@/components/page-banner";
import { getLocale, getT } from "@/lib/i18n/server";
import { localizedStages } from "@/lib/i18n/content";
import { StageExplorer, type StageCardData } from "@/components/stages/stage-explorer";
import { getPublicLeaders, getStageInfoRows, leadersOfStage, localizeStageInfo } from "@/lib/leaders";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getT()).pages.stages;
  return { title: t.metaTitle, description: t.metaDescription };
}

export default async function StagesPage() {
  const t = (await getT()).pages.stages;
  const locale = await getLocale();
  const stages = localizedStages(locale);
  // Each card opens a pop-up with the stage's text and leaders (0028).
  const [info, leaders] = await Promise.all([getStageInfoRows(), getPublicLeaders()]);
  const cards: StageCardData[] = stages.map((stage) => ({
    code: stage.value,
    name: stage.name,
    info: localizeStageInfo(info[stage.value], locale),
    leaders: leadersOfStage(leaders, stage.value).map(({ id, name, photo, title }) => ({ id, name, photo, title })),
  }));
  return (
    <SiteShell>
      <PageBanner title={t.title(stages.length)} eyebrow={t.eyebrow}>
        {t.intro}
      </PageBanner>

      <section className="mx-auto w-[calc(100%-40px)] max-w-[1100px] py-10">
        <StageExplorer stages={cards} />

        <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl bg-sun px-6 py-6 text-forest sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base font-medium">
            {t.knowStage}
          </p>
          <Link
            href="/signup"
            className="shrink-0 rounded-md bg-forest px-5 py-2.5 text-sm font-bold text-cream transition hover:opacity-90"
          >
            {t.startRegistration} <span aria-hidden className="inline-block rtl:-scale-x-100">→</span>
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
