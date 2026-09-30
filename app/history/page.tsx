import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { SectionHeading } from "@/components/landing/section-heading";
import { Timeline, type RopeEntry } from "@/components/landing/timeline";
import { ValueIcon } from "@/components/landing/icons";
import { Scenery } from "@/components/history/scenery";
import { FOUNDED } from "@/lib/site-content";
import { getLocale, getT } from "@/lib/i18n/server";
import { localizedCamps, localizedMilestones, localizedValues } from "@/lib/i18n/content";
import type { Locale } from "@/lib/i18n/config";
import { cloudinaryConfigured, getAlbumPhotos, getAlbums } from "@/lib/cloudinary";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getT()).history;
  return { title: t.metaTitle, description: t.metaDescription(FOUNDED) };
}

const years = new Date().getFullYear() - FOUNDED;

/**
 * Milestones and camps, oldest first, each camp with its photos if its
 * Cloudinary album exists. Matched by the album's folder name, or failing
 * that by year + season in its name — so a camp whose place was typed
 * differently when uploading still finds its photos.
 */
async function ropeEntries(locale: Locale): Promise<RopeEntry[]> {
  const albums = cloudinaryConfigured() ? await getAlbums() : [];

  const camps = await Promise.all(
    localizedCamps(locale).map(async (camp): Promise<RopeEntry> => {
      const album =
        albums.find((a) => a.slug === camp.slug) ??
        albums.find(
          (a) =>
            a.name.includes(String(camp.year)) &&
            a.name.toLowerCase().includes(camp.season.toLowerCase()),
        );
      const photos = album ? await getAlbumPhotos(album.slug) : [];
      return {
        kind: "camp",
        key: camp.slug,
        ...camp,
        slug: album?.slug ?? camp.slug,
        photos: photos.map(({ publicId, width, height }) => ({ publicId, width, height })),
      };
    }),
  );

  const milestones: RopeEntry[] = localizedMilestones(locale).map((m) => ({
    kind: "milestone",
    key: `milestone-${m.year}`,
    ...m,
  }));

  // Within a year: winter camp, then summer camp, then that year's milestone.
  const order = (e: RopeEntry) =>
    e.year * 10 + (e.kind === "milestone" ? 9 : e.season === "Winter" ? 1 : 5);
  return [...milestones, ...camps].sort((a, b) => order(a) - order(b));
}

export default async function HistoryPage() {
  const locale = await getLocale();
  const t = (await getT()).history;
  const entries = await ropeEntries(locale);
  const firstCampYear = Math.min(...entries.filter((e) => e.kind === "camp").map((e) => e.year));
  const withPhotos = entries.filter((e) => e.kind === "camp" && e.photos.length).length;

  return (
    <SiteShell>
      <div className="relative isolate overflow-hidden bg-cream pb-14">
        <Scenery />

        <section className="relative mx-auto w-[calc(100%-40px)] max-w-[880px] pt-8 sm:pt-10">
          <p className="flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-maroon sm:text-xs">
            <span aria-hidden className="h-px flex-1 bg-maroon/60" />
            {t.eyebrow}
            <span aria-hidden className="h-px flex-1 bg-maroon/60" />
          </p>
          <h1 className="mt-5 text-[clamp(34px,6vw,50px)] font-bold leading-none text-maroon">
            {t.title}
          </h1>
          <p className="mt-2 text-[clamp(18px,2.6vw,23px)] font-bold leading-snug text-forest">
            {t.subtitle(years)}
          </p>
          <p className="mt-2 max-w-[640px] text-[clamp(15px,1.8vw,17px)] leading-relaxed text-[#141414]/85">
            {t.intro}
          </p>
        </section>

        <section aria-labelledby="rope-heading" className="relative mx-auto w-[calc(100%-40px)] max-w-[880px]">
          <h2 id="rope-heading" className="sr-only">
            {t.ropeHeading(FOUNDED)}
          </h2>
          <p className="mt-6 text-sm text-ink-muted">
            {t.ropeNote(firstCampYear, withPhotos > 0)}
          </p>
          <Timeline entries={entries} />
        </section>
      </div>

      {/* ------------------------------------------------ Moments That Matter */}
      <section aria-labelledby="moments-heading" className="on-dark bg-forest">
        <div className="mx-auto flex w-[calc(100%-40px)] max-w-[1100px] flex-col items-start gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="moments-heading" className="text-[clamp(24px,4vw,32px)] leading-tight text-sun">
              {t.momentsTitle}
            </h2>
            <p className="mt-1 text-[15px] text-white/90 sm:text-base">
              {t.momentsBody}
            </p>
          </div>
          <Link
            href="/gallery"
            className="shrink-0 rounded-md bg-maroon px-6 py-2.5 text-base font-bold text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5"
          >
            {t.seeAll}
          </Link>
        </div>
      </section>

      <section
        aria-labelledby="values-heading"
        className="bg-surface py-12"
      >
        <div className="mx-auto w-[calc(100%-40px)] max-w-[1100px]">
          <div className="reveal max-w-2xl">
            <SectionHeading
              id="values-heading"
              title={t.valuesTitle}
              subtitle={t.valuesSubtitle}
            />
          </div>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {localizedValues(locale).map((v) => (
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

      <NextSteps seeStages={t.seeStages} joinUs={t.joinUs} />
    </SiteShell>
  );
}

/** Closing links, so a page never ends in a dead end. */
function NextSteps({ seeStages, joinUs }: { seeStages: string; joinUs: string }) {
  return (
    <div className="mx-auto flex w-[calc(100%-40px)] max-w-[1100px] flex-wrap gap-3 py-10">
      <Link
        href="/stages"
        className="rounded-md bg-forest px-5 py-2.5 text-sm font-bold text-cream transition hover:opacity-90"
      >
        {seeStages} <span aria-hidden className="inline-block rtl:-scale-x-100">→</span>
      </Link>
      <Link
        href="/signup"
        className="rounded-md bg-sun px-5 py-2.5 text-sm font-bold text-forest transition hover:opacity-90"
      >
        {joinUs}
      </Link>
    </div>
  );
}
