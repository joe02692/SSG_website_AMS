import Image from "next/image";
import { SectionHeading } from "@/components/landing/section-heading";
import { FOUNDED, REHAB_FOUNDED } from "@/lib/site-content";
import { getLocale, getT } from "@/lib/i18n/server";
import {
  localizedAboutPoints,
  localizedBranches,
  localizedFacts,
  localizedLaw,
  localizedPromise,
  localizedSeason,
  localizedWider,
} from "@/lib/i18n/content";
// The Al Rehab branch in its early days, with the group banner at Al Rehab
// Sports Club (sent by Zyad, 30 Sep 2026).
import teamPhoto from "@/public/images/rehab-2010.jpg";

/**
 * The homepage's three "who we are" sections — About us, Our goals and About
 * Scouting — rewritten in English from the group's earlier site. The words
 * live in lib/site-content.ts; this file is only layout.
 */

function Check() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="mt-0.5 size-5 shrink-0 text-leaf">
      <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.15" />
      <path d="m6 10.5 2.5 2.5L14 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Pin() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="size-5 shrink-0 text-maroon">
      <path d="M10 18s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10z" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="10" cy="8" r="2.2" fill="currentColor" />
    </svg>
  );
}

// ---------------------------------------------------------------- About us --
export async function AboutUs() {
  const t = (await getT()).home.about;
  const locale = await getLocale();
  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="mx-auto mt-14 grid w-[calc(100%-40px)] max-w-[1100px] gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12"
    >
      <div>
        <SectionHeading
          id="about-heading"
          title={t.title}
          subtitle={t.subtitle(FOUNDED)}
        />
        <div className="mt-4 space-y-3 text-[16px] leading-relaxed text-[#141414]/85">
          <p>{t.p1(FOUNDED)}</p>
          <p>{t.p2}</p>
          <p>{t.p3}</p>
        </div>
        <ul className="mt-5 space-y-2.5">
          {localizedAboutPoints(locale).map((point) => (
            <li key={point} className="flex gap-2.5 text-[15px] leading-snug text-forest">
              <Check />
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-4">
        <div className="reveal relative aspect-[4/3] overflow-hidden rounded-2xl bg-forest shadow-md">
          <Image
            src={teamPhoto}
            alt={t.photoAlt}
            fill
            placeholder="blur"
            sizes="(min-width: 1024px) 520px, 100vw"
            quality={90}
            className="object-cover object-[50%_62%]"
          />
          <span className="absolute start-3 top-3 rounded-full bg-sun px-3 py-1 text-sm font-bold text-forest shadow">
            {t.rehabSince(REHAB_FOUNDED)}
          </span>
        </div>
        <div className="rounded-2xl border-2 border-line bg-surface-raised p-5">
          <h3 className="font-display text-lg text-maroon">{t.whereWeMeet}</h3>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {localizedBranches(locale).map((branch) => (
              <li key={branch.name} className="flex gap-2">
                <Pin />
                <span className="leading-tight">
                  <span className="block text-[15px] font-semibold text-forest">{branch.name}</span>
                  <span className="block text-xs text-ink-muted">
                    {branch.city}
                    {branch.note ? ` · ${branch.note}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// --------------------------------------------------------------- Our goals --
export async function OurGoals() {
  const t = (await getT()).home.goals;
  const locale = await getLocale();
  return (
    <section aria-labelledby="goals-heading" className="mt-14 bg-surface py-12">
      <div className="mx-auto w-[calc(100%-40px)] max-w-[1100px]">
        <SectionHeading
          id="goals-heading"
          title={t.title}
          subtitle={t.subtitle}
        />
        {/* The Scout Promise */}
        <figure className="reveal relative mt-7 overflow-hidden rounded-2xl bg-forest px-6 py-6 text-cream sm:px-9 sm:py-8">
          <span
            aria-hidden
            className="pointer-events-none absolute -top-6 end-4 font-display text-[140px] leading-none text-sun/15 select-none"
          >
            ”
          </span>
          <figcaption className="text-sm font-semibold uppercase tracking-[0.14em] text-butter">
            {t.promiseLabel}
          </figcaption>
          <blockquote className="relative mt-2 font-display text-[clamp(19px,2.6vw,26px)] font-bold leading-relaxed text-sun">
            {localizedPromise(locale)}
          </blockquote>
        </figure>

        {/* The Scout Law — eleven articles */}
        <h3 className="mt-10 font-display text-[clamp(20px,3vw,24px)] text-maroon">{t.lawTitle}</h3>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {localizedLaw(locale).map((law, i) => (
            <li
              key={law.word}
              className="reveal group relative overflow-hidden rounded-2xl border-2 border-line bg-surface-raised p-5 transition hover:-translate-y-1 hover:border-leaf hover:shadow-lg"
            >
              {/* Big faint number, drawn by CSS (::before) so it is pure
                  decoration — the list is already numbered for screen readers. */}
              <span
                aria-hidden
                data-n={String(i + 1).padStart(2, "0")}
                className="absolute end-3 top-1 font-display text-[56px] font-extrabold leading-none text-butter/70 before:content-[attr(data-n)]"
              />
              <span
                aria-hidden
                className="relative grid size-11 place-items-center rounded-full bg-sun font-display text-lg font-extrabold text-forest transition group-hover:rotate-6"
              >
                {i + 1}
              </span>
              <h4 className="relative mt-3 text-xl font-bold text-forest">{law.word}</h4>
              <p className="relative mt-1 text-[15px] leading-relaxed text-ink-muted">{law.body}</p>
            </li>
          ))}
        </ol>

        {/* A season with El-Salam */}
        <div className="mt-12 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <h3 className="font-display text-[clamp(20px,3vw,24px)] text-maroon">{t.seasonTitle}</h3>
            <p className="mt-1 text-[15px] text-ink-muted">
              {t.seasonSubtitle}
            </p>
            <ol className="relative mt-5 space-y-3 border-s-2 border-sun ps-6">
              {localizedSeason(locale).map((item) => (
                <li key={item.title} className="reveal relative">
                  <span
                    aria-hidden
                    className="absolute -start-[33px] top-1.5 size-4 rounded-full border-4 border-surface bg-leaf"
                  />
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand-ink">
                    {item.when} · {item.where}
                  </p>
                  <p className="text-[17px] font-bold text-forest">{item.title}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="self-start rounded-2xl bg-forest p-6 text-cream">
            <h3 className="font-display text-xl text-sun">{t.beyondTitle}</h3>
            <p className="mt-1 text-sm text-cream/80">{t.beyondIntro}</p>
            <ul className="mt-4 space-y-2.5">
              {localizedWider(locale).map((item) => (
                <li key={item} className="flex gap-2.5 text-[15px] leading-snug">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-sun" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-cream/15 pt-4 text-sm leading-relaxed text-cream/80">
              {t.refreshed}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------- About Scouting --
export async function AboutScouting() {
  const t = (await getT()).home.scouting;
  const locale = await getLocale();
  return (
    <section aria-labelledby="scouting-heading" className="on-dark relative overflow-hidden bg-forest py-14 text-cream">
      <div aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-sun" />
      <div className="mx-auto grid w-[calc(100%-40px)] max-w-[1100px] gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-butter">{t.eyebrow}</p>
          <h2 id="scouting-heading" className="mt-2 text-[clamp(26px,4.5vw,36px)] leading-tight text-sun">
            {t.title}
          </h2>
          <div className="mt-4 space-y-3 text-[16px] leading-relaxed text-cream/90">
            <p>{t.p1}</p>
            <p>{t.p2}</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          {localizedFacts(locale).map((fact) => (
            <div
              key={fact.value}
              className="reveal flex flex-col-reverse rounded-2xl border border-cream/15 bg-cream/5 p-4"
            >
              <dt className="mt-1.5 text-sm leading-snug text-cream/85">{fact.label}</dt>
              <dd className="font-display text-[clamp(28px,4vw,36px)] font-extrabold leading-none text-sun">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
