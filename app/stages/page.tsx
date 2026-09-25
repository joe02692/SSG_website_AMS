import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { PageBanner } from "@/components/page-banner";
import { STAGES } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Our Stages",
  description: "The stages of El-Salam Scouting Group, from the youngest Buds to the Rovers.",
};

const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
const stageCount = NUMBER_WORDS[STAGES.length] ?? String(STAGES.length);

export default function StagesPage() {
  return (
    <SiteShell>
      <PageBanner title={`${stageCount} Stages, One Family`} arabic="مراحلنا">
        From the youngest Buds to the Rovers, every age has a place. You choose
        your stage when you register.
      </PageBanner>

      <section className="mx-auto w-[calc(100%-40px)] max-w-[1100px] py-10">
        <ol className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-4">
          {STAGES.map((stage, i) => (
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
              <span className="min-w-0">
                <span lang="ar" dir="rtl" className="block w-fit font-display text-lg leading-tight text-forest">
                  {stage.ar}
                </span>
                <span className="block text-sm text-ink-muted">{stage.en}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl bg-sun px-6 py-6 text-forest sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base font-medium">
            Know your stage? Registration takes about a minute.
          </p>
          <Link
            href="/signup"
            className="shrink-0 rounded-md bg-forest px-5 py-2.5 text-sm font-bold text-cream transition hover:opacity-90"
          >
            Start registration →
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
