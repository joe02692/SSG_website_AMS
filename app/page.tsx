import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { SiteShell } from "@/components/site-shell";
import { HeroSlider } from "@/components/landing/hero-slider";
import { SectionHeading } from "@/components/landing/section-heading";
import { AboutScouting, AboutUs, OurGoals } from "@/components/landing/about-sections";
import { ContactUs } from "@/components/landing/contact-us";
import { FOUNDED, STAGES } from "@/lib/site-content";
import { getLocale, getT } from "@/lib/i18n/server";
import { localizedSlides, localizedStats, shuffled } from "@/lib/i18n/content";
import historyPhoto from "@/public/images/hero-2.jpg";
import stagesPhoto from "@/public/images/activity-2.jpg";
import activitiesPhoto from "@/public/images/activity-4.jpg";
import logo from "@/public/images/logo.png";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.home.metaTitle, description: t.home.metaDescription };
}

/* The homepage is a front door, not the whole house: a welcome, the key
   numbers, and one card for each of the site's other pages. History, the
   stages and the photos each have their own page.

   Colour rules for anyone editing — the palette's yellow can't carry text on
   the cream, so text ON yellow is forest (8.18:1), never white (1.34:1), and
   headings on the cream are maroon (7.54:1), never yellow (1.28:1). */

export default async function HomePage() {
  const t = await getT();
  const locale = await getLocale();
  const h = t.home;
  const explore = [
    {
      href: "/history",
      title: h.explore.history,
      body: h.explore.historyBody(FOUNDED),
      photo: historyPhoto,
      alt: h.explore.historyAlt,
    },
    {
      href: "/stages",
      title: h.explore.stages,
      body: h.explore.stagesBody(STAGES.length),
      photo: stagesPhoto,
      alt: h.explore.stagesAlt,
    },
    {
      href: "/gallery",
      title: h.explore.activities,
      body: h.explore.activitiesBody,
      photo: activitiesPhoto,
      alt: h.explore.activitiesAlt,
    },
  ];
  return (
    <SiteShell>
      {/* ---------------------------------------------------------------- Hero */}
      {/* Tall enough on desktop that the photos (3:2) keep people's heads:
          it fills the screen below the 72px header, but never goes wider
          than about 1.6:1. Phones get most of the screen. */}
      <section className="relative flex h-[clamp(480px,82svh,720px)] w-full flex-col overflow-hidden bg-forest lg:h-[clamp(560px,min(calc(100svh_-_72px),62vw),1000px)]">
        <HeroSlider slides={shuffled(localizedSlides(locale))}>
          <h1>
            <span className="mb-2 block font-sans text-[clamp(0.95rem,3.4vw,28px)] leading-none tracking-[-0.02em] text-white [text-shadow:0_1px_10px_rgb(0_0_0/0.45)]">
              {h.heroTagline}
            </span>
            {/* Solid white with the year in brand yellow. A soft shadow (not an
                outline) keeps it readable on bright and dark photos alike. */}
            <span className="block font-display text-[clamp(2.1rem,9vw,56px)] font-extrabold leading-none tracking-[0.02em] text-white [text-shadow:0_2px_14px_rgb(0_0_0/0.5)]">
              {h.heroSince} <span className="text-sun">{FOUNDED}</span>
            </span>
          </h1>
          <div className="on-dark mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-md bg-sun px-5 py-2.5 text-sm font-bold text-forest shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:shadow-xl sm:text-base"
            >
              {h.joinUs}
            </Link>
            <Link
              href="/history"
              className="rounded-md border-2 border-white/80 px-5 py-2 text-sm font-bold text-white backdrop-blur-[2px] transition hover:bg-white/10 sm:text-base"
            >
              {h.ourStory}
            </Link>
          </div>
        </HeroSlider>
      </section>

      {/* -------------------------------------------------------- Intro + stats */}
      <section className="mx-auto grid w-[calc(100%-40px)] max-w-[1100px] items-center gap-7 pt-10 lg:grid-cols-[1.15fr_1fr] lg:gap-12 lg:pt-12">
        <div>
          <p className="font-display text-base text-maroon">
            {h.welcome}
          </p>
          <p className="mt-2 text-[clamp(18px,2.4vw,23px)] leading-snug text-[#141414]">
            {h.intro}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          {localizedStats(locale).map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col-reverse rounded-2xl border-2 border-sun bg-surface-raised px-3 py-4 text-center transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <dt className="mt-1.5 text-sm font-medium text-leaf">{stat.label}</dt>
              <dd className="font-display text-[clamp(28px,4.5vw,36px)] font-semibold leading-none text-leaf">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ------------------------------ About us · Our goals · About Scouting */}
      <AboutUs />
      <OurGoals />
      <AboutScouting />

      {/* ------------------------------------------------------------- Explore */}
      <section
        aria-labelledby="explore-heading"
        className="mx-auto mt-14 w-[calc(100%-40px)] max-w-[1100px]"
      >
        <SectionHeading
          id="explore-heading"
          title={h.explore.title}
          subtitle={h.explore.subtitle}
        />
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {explore.map((card) => (
            <li key={card.href} className="reveal">
              <Link
                href={card.href}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border-2 border-line bg-surface-raised transition hover:-translate-y-1 hover:border-leaf hover:shadow-lg"
              >
                <span className="relative block aspect-[16/10] overflow-hidden bg-forest">
                  <Image
                    src={card.photo}
                    alt={card.alt}
                    fill
                    placeholder="blur"
                    sizes="(min-width: 768px) 360px, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                </span>
                <span className="flex flex-1 flex-col p-5">
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-display text-xl text-forest">{card.title}</span>
                    <span
                      aria-hidden
                      className="grid size-8 shrink-0 place-items-center rounded-full bg-sun text-forest transition group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
                    >
                      →
                    </span>
                  </span>
                  <span className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">{card.body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------------ Contact */}
      <ContactUs />

      {/* ---------------------------------------------------------------- Join */}
      <section id="join" aria-labelledby="join-heading" className="px-5 py-12">
        <div className="reveal relative mx-auto flex max-w-[1100px] flex-col items-start justify-between gap-5 overflow-hidden rounded-3xl bg-sun px-6 py-7 sm:flex-row sm:items-center sm:px-9">
          <Image
            src={logo}
            alt=""
            className="pointer-events-none absolute -end-10 -top-8 w-48 rotate-12 opacity-[0.12] mix-blend-multiply"
          />
          <div className="relative">
            <h2 id="join-heading" className="text-[clamp(22px,3.6vw,28px)] text-maroon">
              {h.join.title}
            </h2>
            <p className="mt-2 max-w-[460px] text-[15px] leading-relaxed text-forest">
              {h.join.body}
            </p>
          </div>
          <div className="relative flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <Link
              href="/signup"
              className="rounded-md bg-forest px-6 py-2.5 text-sm font-bold text-cream transition hover:-translate-y-0.5 hover:shadow-lg sm:text-base"
            >
              {h.join.signUp}
            </Link>
            <p className="text-sm leading-snug text-maroon">
              {h.join.haveAccount}{" "}
              <Link href="/login" className="font-semibold underline underline-offset-2">
                {h.join.logIn}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
