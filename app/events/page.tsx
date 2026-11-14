import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { PageBanner } from "@/components/page-banner";
import { EventCard, FeaturedEvent } from "@/components/events/event-card";
import { EventPapersSection } from "@/components/events/event-papers-section";
import { getCurrentProfile } from "@/lib/dal";
import { isStaffRole } from "@/lib/roles";
import { getUpcomingEvents, localizeEvent } from "@/lib/events";
import { editableEventPapers, getEventPapers } from "@/lib/request-papers";
import { getLocale, getT } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getT()).features.events;
  return { title: t.metaTitle, description: t.metaDescription };
}

/**
 * Upcoming events — open to everyone. Leaders also see, at the bottom, the
 * tools each stage needs for each event (migration 0028).
 */
export default async function EventsPage() {
  const t = (await getT()).features.events;
  const locale = await getLocale();
  const [{ rows, missing }, profile] = await Promise.all([getUpcomingEvents(), getCurrentProfile()]);
  const events = rows.map((row) => localizeEvent(row, locale));
  const [next, ...rest] = events;
  const dateLocale = intlLocale(locale);
  const now = requestTime();

  const leader = profile && isStaffRole(profile.role) ? profile : null;
  const [papers, editable] = leader
    ? await Promise.all([getEventPapers(events.map((e) => e.id)), editableEventPapers(leader)])
    : [{}, []];

  return (
    <SiteShell>
      <PageBanner title={t.title} eyebrow={t.eyebrow}>
        {t.intro}
      </PageBanner>

      <div className="mx-auto w-[calc(100%-40px)] max-w-[1100px] py-10 sm:py-14">
        {missing && leader ? (
          <p className="mb-6 rounded-lg border border-warning-line bg-warning-surface px-3 py-2.5 text-sm text-warning-ink">
            {t.missing}
          </p>
        ) : null}

        {next ? (
          <FeaturedEvent event={next} locale={dateLocale} t={t} now={now} />
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-line bg-surface-raised px-6 py-14 text-center">
            <svg aria-hidden viewBox="0 0 48 48" className="size-14 text-leaf" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
              <path d="M24 8 6 40h36L24 8Z" />
              <path d="M24 8v32M18 40l6-12 6 12" />
            </svg>
            <h2 className="text-xl text-forest">{t.noneTitle}</h2>
            <p className="max-w-md text-sm text-ink-muted">{t.noneBody}</p>
            <Link href="/gallery" className="mt-2 rounded-md bg-sun px-4 py-2 text-sm font-bold text-forest transition hover:opacity-85">
              {t.seeGallery}
            </Link>
          </div>
        )}

        {rest.length > 0 ? (
          <section aria-labelledby="more-events-heading" className="mt-12">
            <h2 id="more-events-heading" className="text-[clamp(20px,3vw,26px)] text-maroon">
              {t.moreTitle}
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((event) => (
                <EventCard key={event.id} event={event} locale={dateLocale} t={t} now={now} />
              ))}
            </div>
          </section>
        ) : null}

        {!leader ? (
          <div className="mt-12 flex flex-col items-start gap-4 rounded-2xl bg-sun px-6 py-6 text-forest sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base font-medium">{t.joinPrompt}</p>
            <Link href="/signup" className="shrink-0 rounded-md bg-forest px-5 py-2.5 text-sm font-bold text-cream transition hover:opacity-90">
              {t.joinButton} <span aria-hidden className="inline-block rtl:-scale-x-100">→</span>
            </Link>
          </div>
        ) : (
          <EventPapersSection events={events} papers={papers} editable={editable} />
        )}
      </div>
    </SiteShell>
  );
}

/** The time this page is rendered (pages here are rendered per request). */
function requestTime(): number {
  return Date.now();
}
