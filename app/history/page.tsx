import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { PageBanner } from "@/components/page-banner";
import { SectionHeading } from "@/components/landing/section-heading";
import { Timeline } from "@/components/landing/timeline";
import { ValueIcon } from "@/components/landing/icons";
import { FOUNDED, VALUES } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Our History",
  description: `How El-Salam Scouting Group grew from one troop in ${FOUNDED} — and what it still stands for.`,
};

const years = new Date().getFullYear() - FOUNDED;
const yearsInWords =
  years >= 55 ? "Nearly sixty" : years >= 45 ? "Nearly fifty" : `${years}`;

export default function HistoryPage() {
  return (
    <SiteShell>
      <PageBanner title="Our History" arabic="تاريخنا">
        {yearsInWords} years in the same neighbourhood. What began as one troop
        in a borrowed hall is now a whole family of stages and hundreds of
        families. The uniform has changed; the promise hasn&apos;t.
      </PageBanner>

      <section
        aria-labelledby="timeline-heading"
        className="mx-auto w-[calc(100%-40px)] max-w-[832px] pt-10"
      >
        <SectionHeading
          id="timeline-heading"
          title="How We Got Here"
          subtitle={`From ${FOUNDED} to today`}
        />
        <Timeline />
      </section>

      <section
        aria-labelledby="values-heading"
        className="mt-14 bg-surface py-12"
      >
        <div className="mx-auto w-[calc(100%-40px)] max-w-[1100px]">
          <div className="reveal max-w-2xl">
            <SectionHeading
              id="values-heading"
              title="What We Stand For"
              subtitle="Three words on every neckerchief"
            />
          </div>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {VALUES.map((v) => (
              <li
                key={v.title}
                className="reveal group rounded-2xl border-2 border-line bg-surface-raised p-5 transition hover:-translate-y-1 hover:border-leaf hover:shadow-lg"
              >
                <span className="grid size-12 place-items-center rounded-full bg-sun text-forest transition group-hover:rotate-6">
                  <ValueIcon name={v.icon} />
                </span>
                <h3 className="mt-3 text-xl text-forest">{v.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">{v.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <NextSteps />
    </SiteShell>
  );
}

/** Closing links, so a page never ends in a dead end. */
function NextSteps() {
  return (
    <div className="mx-auto flex w-[calc(100%-40px)] max-w-[1100px] flex-wrap gap-3 py-10">
      <Link
        href="/stages"
        className="rounded-md bg-forest px-5 py-2.5 text-sm font-bold text-cream transition hover:opacity-90"
      >
        See our stages →
      </Link>
      <Link
        href="/signup"
        className="rounded-md bg-sun px-5 py-2.5 text-sm font-bold text-forest transition hover:opacity-90"
      >
        Join Us
      </Link>
    </div>
  );
}
