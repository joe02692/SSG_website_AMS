import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { PageBanner } from "@/components/page-banner";
import { getLocale, getT } from "@/lib/i18n/server";
import { localizedStages } from "@/lib/i18n/content";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getT()).pages.stages;
  return { title: t.metaTitle, description: t.metaDescription };
}

export default async function StagesPage() {
  const t = (await getT()).pages.stages;
  const stages = localizedStages(await getLocale());
  return (
    <SiteShell>
      <PageBanner title={t.title(stages.length)} eyebrow={t.eyebrow}>
        {t.intro}
      </PageBanner>

      <section className="mx-auto w-[calc(100%-40px)] max-w-[1100px] py-10">
        <ol className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-4">
          {stages.map((stage, i) => (
            <li
              key={stage.value}
              className="reveal flex items-center gap-3 rounded-xl border-2 border-line bg-surface-raised p-4 transition hover:-translate-y-0.5 hover:border-leaf hover:shadow-md"
            >
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-full bg-forest font-display text-sm font-semibold text-sun"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 font-display text-lg leading-tight text-forest">
                {stage.name}
              </span>
            </li>
          ))}
        </ol>

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
