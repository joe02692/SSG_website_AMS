import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { SiteShell } from "@/components/site-shell";
import { HeroSlider } from "@/components/landing/hero-slider";
import { ValueIcon } from "@/components/landing/icons";
import {
  ACTIVITIES,
  FOUNDED,
  HERO_SLIDES,
  MILESTONES,
  STAGES,
  STATS,
  VALUES,
} from "@/lib/site-content";
import rope from "@/public/images/rope.jpg";
import logo from "@/public/images/logo.png";

export const metadata: Metadata = {
  title: "El-Salam Scouting Group",
  description:
    "El-Salam Scouting Group — over 400 scouts, leaders and families building character, service and friendship since 1977.",
};

/* Colour rules for anyone editing this page — the palette's yellow can't
   carry text on the cream, so:
     • text ON yellow is forest (8.18:1), never white (1.34:1)
     • headings ON the cream are maroon (7.54:1), never yellow (1.28:1)
   Yellow text appears only on the green band, and only at 24px and up, where
   large text needs 3:1; it measures 3.82:1. */

const years = new Date().getFullYear() - FOUNDED;
const yearsInWords =
  years >= 55 ? "Nearly sixty" : years >= 45 ? "Nearly fifty" : `${years}`;

const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
const stageCount = NUMBER_WORDS[STAGES.length] ?? String(STAGES.length);

/** Section heading pair used down the page: maroon title, green subtitle. */
function SectionHeading({
  id,
  title,
  subtitle,
  onDark = false,
}: {
  id: string;
  title: string;
  subtitle: string;
  onDark?: boolean;
}) {
  return (
    <>
      <h2
        id={id}
        className={`text-[clamp(28px,6vw,40px)] leading-tight ${onDark ? "text-sun" : "text-maroon"}`}
      >
        {title}
      </h2>
      <p
        // On the green band the subtitle never drops below 24px: butter on
        // leaf is 4.38:1, which passes only as large text.
        className={`mt-2 font-medium leading-tight ${
          onDark ? "text-[clamp(24px,4vw,26px)] text-butter" : "text-[clamp(20px,4vw,26px)] text-brand-ink"
        }`}
      >
        {subtitle}
      </p>
    </>
  );
}

export default function HomePage() {
  return (
    <SiteShell>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative h-[min(82svh,720px)] min-h-[420px] w-full overflow-hidden bg-forest">
        <HeroSlider slides={HERO_SLIDES} />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 bg-linear-to-t from-black/65 via-black/15 via-45% to-black/10"
        />
        <div className="absolute inset-x-0 bottom-16 z-10 px-4 text-center sm:bottom-20">
          <h1>
            <span className="mb-3 block font-sans text-[clamp(1rem,4.7vw,40px)] leading-none tracking-[-0.02em] text-white [text-shadow:0_1px_10px_rgb(0_0_0/0.45)]">
              Character, Service &amp; Friendship
            </span>
            <span className="block font-display text-[clamp(2.4rem,12vw,76px)] leading-none text-white [text-shadow:2px_0_var(--color-sun),-2px_0_var(--color-sun),0_2px_var(--color-sun),0_-2px_var(--color-sun)]">
              SINCE {FOUNDED}
            </span>
          </h1>
          <div className="on-dark mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-md bg-sun px-6 py-3 font-bold text-forest shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Join Us
            </Link>
            <Link
              href="/#history"
              className="rounded-md border-2 border-white/80 px-6 py-[10px] font-bold text-white backdrop-blur-[2px] transition hover:bg-white/10"
            >
              Our Story
            </Link>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- Intro + stats */}
      <section className="mx-auto grid w-[calc(100%-40px)] max-w-[1100px] items-center gap-8 pt-12 lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:pt-16">
        {/* No .reveal on this block: it sits at the fold on most screens, and
            text that starts half-faded before anyone has scrolled reads as a
            rendering glitch, not an effect. */}
        <div>
          <p className="font-display text-lg text-maroon">
            Welcome ·{" "}
            <span lang="ar" dir="rtl">
              أهلاً بكم
            </span>
          </p>
          <p className="mt-3 text-[clamp(20px,3.4vw,30px)] leading-snug text-[#141414]">
            El-Salam Scouting Group brings together more than 400 scouts,
            leaders and families. We hike, camp, serve our community — and grow
            up a little braver for it.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col-reverse rounded-2xl border-2 border-sun bg-surface-raised px-3 py-5 text-center transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <dt className="mt-2 text-[15px] font-medium text-leaf">{stat.label}</dt>
              <dd className="font-display text-[clamp(32px,6vw,46px)] font-semibold leading-none text-leaf">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ------------------------------------------------------ Register banner */}
      <section className="reveal mx-auto mt-10 flex w-[calc(100%-40px)] max-w-[1100px] flex-col items-center gap-5 rounded-2xl bg-sun px-6 py-7 text-center text-forest sm:flex-row sm:justify-between sm:px-9 sm:text-left">
        <p className="flex items-center gap-3 text-[clamp(18px,2.6vw,22px)] font-medium leading-tight">
          <span aria-hidden className="relative flex size-3 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-leaf opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-3 rounded-full bg-leaf" />
          </span>
          New season registration is currently available
        </p>
        <Link
          href="/signup"
          className="shrink-0 rounded-md bg-leaf px-7 py-3 font-bold text-white transition hover:bg-brand-700"
        >
          Join Us
        </Link>
      </section>

      {/* -------------------------------------------------------------- Values */}
      <section
        aria-labelledby="values-heading"
        className="mx-auto mt-16 w-[calc(100%-40px)] max-w-[1100px]"
      >
        <div className="reveal max-w-2xl">
          <SectionHeading
            id="values-heading"
            title="What We Stand For"
            subtitle="Three words on every neckerchief"
          />
        </div>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {VALUES.map((v) => (
            <li
              key={v.title}
              className="reveal group rounded-2xl border-2 border-line bg-surface-raised p-6 transition hover:-translate-y-1 hover:border-leaf hover:shadow-lg"
            >
              <span className="grid size-14 place-items-center rounded-full bg-sun text-forest transition group-hover:rotate-6">
                <ValueIcon name={v.icon} />
              </span>
              <h3 className="mt-4 text-2xl text-forest">{v.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-muted">{v.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------------- History */}
      <section
        id="history"
        aria-labelledby="history-heading"
        className="mx-auto mt-20 w-[calc(100%-40px)] max-w-[832px] pb-4"
      >
        <div className="reveal">
          <SectionHeading
            id="history-heading"
            title="Our History"
            subtitle={`${yearsInWords} years in the same neighbourhood`}
          />
          <p className="mt-3 max-w-[640px] leading-relaxed text-[#141414]">
            What began as one troop in a borrowed hall is now a whole family of
            stages and hundreds of families. The uniform has changed; the
            promise hasn&apos;t.
          </p>
        </div>

        {/* The rope is decoration: the milestones are a real ordered list, so
            a screen reader hears them in date order regardless of which side
            of the rope each one sits on. */}
        <div className="relative mx-auto mt-10">
          <Image
            src={rope}
            alt=""
            className="pointer-events-none absolute left-0 top-0 z-0 h-full w-12 object-fill mix-blend-multiply sm:left-1/2 sm:w-[72px] sm:-translate-x-1/2 md:w-[88px]"
          />
          {/* Phones: rope down the left edge, every milestone to its right —
              the zigzag leaves each column about 130px wide on a phone,
              which turned one sentence into eight lines. From sm up, the
              design's alternating layout. */}
          <ol className="relative grid grid-cols-[48px_1fr] gap-x-3 gap-y-6 sm:grid-cols-[1fr_72px_1fr] sm:gap-x-1.5 sm:gap-y-0 md:grid-cols-[1fr_88px_1fr] md:gap-x-3">
            {MILESTONES.map((m, i) => {
              const right = i % 2 === 0;
              return (
                <li
                  key={m.year}
                  style={{ gridRow: i + 1 }}
                  // From sm up each milestone overlaps the one before it by
                  // ~60px on the other side of the rope — the design's zigzag.
                  className={`reveal relative z-10 col-start-2 flex flex-col items-start justify-center text-left sm:min-h-[136px] ${
                    i > 0 ? "sm:-mt-16" : ""
                  } ${right ? "sm:col-start-3 sm:pl-1.5" : "sm:col-start-1 sm:items-end sm:pr-1.5 sm:text-right"}`}
                >
                  <p className="rounded-full border-2 border-maroon px-3 py-0.5 font-display text-lg font-semibold text-maroon sm:text-[22px]">
                    {m.year}
                  </p>
                  <h3 className="mt-2 font-sans text-lg font-bold text-[#141414]">
                    {m.title}
                  </h3>
                  <p className="mt-1 text-sm leading-normal text-[#141414]/80">
                    {m.body}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* -------------------------------------------------------------- Stages */}
      <section
        id="stages"
        aria-labelledby="stages-heading"
        className="mt-16 bg-surface py-14"
      >
        <div className="mx-auto w-[calc(100%-40px)] max-w-[1100px]">
          <div className="reveal max-w-2xl">
            <SectionHeading
              id="stages-heading"
              title={`${stageCount} Stages, One Family`}
              subtitle="From the youngest Buds to the Rovers, every age has a place"
            />
          </div>
          <ol className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {STAGES.map((stage, i) => (
              <li
                key={stage.value}
                className="reveal flex items-center gap-3 rounded-xl border-2 border-line bg-surface-raised p-4 transition hover:border-leaf"
              >
                <span
                  aria-hidden
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-forest font-display text-sm font-semibold text-sun"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span lang="ar" dir="rtl" className="block font-display text-xl leading-tight text-forest">
                    {stage.ar}
                  </span>
                  <span className="block text-sm text-ink-muted">{stage.en}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-ink-muted">
            You choose your stage when you register.{" "}
            <Link href="/signup" className="font-semibold text-maroon underline underline-offset-4 hover:opacity-75">
              Start your registration →
            </Link>
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------- Activities */}
      <section
        aria-labelledby="activities-heading"
        className="on-dark bg-leaf px-5 pb-14 pt-12"
      >
        <div className="mx-auto max-w-[1100px]">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="reveal">
              <SectionHeading
                id="activities-heading"
                title="Our Activities"
                subtitle="Where the learning actually happens"
                onDark
              />
              <p className="mt-3 max-w-[640px] leading-relaxed text-cream">
                Weekend hikes, summer camps and service projects — a look at
                what a year with El-Salam involves.
              </p>
            </div>
            <Link
              href="/gallery"
              className="rounded-md bg-sun px-[22px] py-2.5 text-[15px] font-bold text-forest transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              See All →
            </Link>
          </div>

          {/* Bento: the first photo takes a 2×2 block. On three columns that
              leaves exactly two photos beside it and three beneath — nine
              cells, no gaps. On two columns the last photo spans the full
              width so nothing is left dangling. */}
          <ul className="mt-8 grid auto-rows-[9rem] grid-cols-2 gap-3 sm:auto-rows-[12rem] md:grid-cols-3">
            {ACTIVITIES.map((photo, i) => (
              <li
                key={photo.name}
                className={`reveal ${i === 0 ? "col-span-2 row-span-2" : ""} ${
                  i === ACTIVITIES.length - 1 ? "max-md:col-span-2" : ""
                }`}
              >
                <Link
                  href="/gallery"
                  className="group relative block h-full overflow-hidden rounded-xl bg-forest"
                >
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    placeholder="blur"
                    sizes={i === 0 ? "(min-width: 768px) 730px, 100vw" : "(min-width: 768px) 360px, 50vw"}
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-linear-to-t from-forest/85 via-forest/10 via-45% to-transparent"
                  />
                  <span className="absolute inset-x-3 bottom-2.5 text-sm font-semibold tracking-wide text-white sm:text-base">
                    {photo.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------------------- Join */}
      <section id="join" aria-labelledby="join-heading" className="px-5 py-12">
        <div className="reveal relative mx-auto flex max-w-[1100px] flex-col items-start justify-between gap-5 overflow-hidden rounded-3xl bg-sun px-6 py-9 sm:flex-row sm:items-center sm:px-10">
          <Image
            src={logo}
            alt=""
            className="pointer-events-none absolute -right-10 -top-8 w-56 rotate-12 opacity-[0.12] mix-blend-multiply"
          />
          <div className="relative">
            <h2
              id="join-heading"
              className="text-[clamp(24px,5vw,34px)] text-maroon"
            >
              Ready to join us?
            </h2>
            <p className="mt-3 max-w-[460px] leading-relaxed text-forest">
              Create your scout account in a minute. Leaders send a request the
              group approves — parent accounts are coming soon.
            </p>
          </div>
          <div className="relative flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <Link
              href="/signup"
              className="rounded-md bg-forest px-7 py-3 font-bold text-cream transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              Sign Up
            </Link>
            <p className="text-sm leading-snug text-maroon">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold underline underline-offset-2">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
