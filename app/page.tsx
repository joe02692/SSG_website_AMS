import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { SiteShell } from "@/components/site-shell";
import { HeroSlider } from "@/components/landing/hero-slider";
import { SectionHeading } from "@/components/landing/section-heading";
import { FOUNDED, HERO_SLIDES, STAGES, STATS } from "@/lib/site-content";
import historyPhoto from "@/public/images/hero-2.jpg";
import stagesPhoto from "@/public/images/activity-2.jpg";
import activitiesPhoto from "@/public/images/activity-4.jpg";
import logo from "@/public/images/logo.png";

export const metadata: Metadata = {
  title: "El-Salam Scouting Group",
  description:
    "El-Salam Scouting Group — over 400 scouts, leaders and families building character, service and friendship since 1977.",
};

/* The homepage is a front door, not the whole house: a welcome, the key
   numbers, and one card for each of the site's other pages. History, the
   stages and the photos each have their own page.

   Colour rules for anyone editing — the palette's yellow can't carry text on
   the cream, so text ON yellow is forest (8.18:1), never white (1.34:1), and
   headings on the cream are maroon (7.54:1), never yellow (1.28:1). */

const EXPLORE = [
  {
    href: "/history",
    title: "Our History",
    arabic: "تاريخنا",
    body: `From one troop in ${FOUNDED} to hundreds of families — and what we still stand for.`,
    photo: historyPhoto,
    alt: "Scouts sitting in a circle on the grass during a patrol meeting",
  },
  {
    href: "/stages",
    title: "Our Stages",
    arabic: "مراحلنا",
    body: `${STAGES.length} stages from the youngest Buds to the Rovers — every age has a place.`,
    photo: stagesPhoto,
    alt: "Guides in white shirts and neckerchiefs posing together in a park",
  },
  {
    href: "/gallery",
    title: "Activities",
    arabic: "أنشطتنا",
    body: "Hikes, camps, trips and service — a look at a year with El-Salam.",
    photo: activitiesPhoto,
    alt: "Scouts and leaders standing on rocks at the edge of a blue sea",
  },
];

export default function HomePage() {
  return (
    <SiteShell>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative h-[min(72svh,600px)] min-h-[380px] w-full overflow-hidden bg-forest">
        <HeroSlider slides={HERO_SLIDES} />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 bg-linear-to-t from-black/65 via-black/15 via-45% to-black/10"
        />
        <div className="absolute inset-x-0 bottom-14 z-10 px-4 text-center sm:bottom-16">
          <h1>
            <span className="mb-2 block font-sans text-[clamp(0.95rem,3.4vw,28px)] leading-none tracking-[-0.02em] text-white [text-shadow:0_1px_10px_rgb(0_0_0/0.45)]">
              Character, Service &amp; Friendship
            </span>
            <span className="block font-display text-[clamp(2.1rem,9vw,56px)] leading-none text-white [text-shadow:2px_0_var(--color-sun),-2px_0_var(--color-sun),0_2px_var(--color-sun),0_-2px_var(--color-sun)]">
              SINCE {FOUNDED}
            </span>
          </h1>
          <div className="on-dark mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-md bg-sun px-5 py-2.5 text-sm font-bold text-forest shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:shadow-xl sm:text-base"
            >
              Join Us
            </Link>
            <Link
              href="/history"
              className="rounded-md border-2 border-white/80 px-5 py-2 text-sm font-bold text-white backdrop-blur-[2px] transition hover:bg-white/10 sm:text-base"
            >
              Our Story
            </Link>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- Intro + stats */}
      <section className="mx-auto grid w-[calc(100%-40px)] max-w-[1100px] items-center gap-7 pt-10 lg:grid-cols-[1.15fr_1fr] lg:gap-12 lg:pt-12">
        <div>
          <p className="font-display text-base text-maroon">
            Welcome ·{" "}
            <span lang="ar" dir="rtl">
              أهلاً بكم
            </span>
          </p>
          <p className="mt-2 text-[clamp(18px,2.4vw,23px)] leading-snug text-[#141414]">
            El-Salam Scouting Group brings together more than 400 scouts,
            leaders and families. We hike, camp, serve our community — and grow
            up a little braver for it.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          {STATS.map((stat) => (
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

      {/* ------------------------------------------------------ Register banner */}
      <section className="mx-auto mt-8 flex w-[calc(100%-40px)] max-w-[1100px] flex-col items-center gap-4 rounded-2xl bg-sun px-6 py-6 text-center text-forest sm:flex-row sm:justify-between sm:px-8 sm:text-left">
        <p className="flex items-center gap-3 text-[clamp(16px,2vw,19px)] font-medium leading-tight">
          <span aria-hidden className="relative flex size-3 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-leaf opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-3 rounded-full bg-leaf" />
          </span>
          New season registration is currently available
        </p>
        <Link
          href="/signup"
          className="shrink-0 rounded-md bg-leaf px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          Join Us
        </Link>
      </section>

      {/* ------------------------------------------------------------- Explore */}
      <section
        aria-labelledby="explore-heading"
        className="mx-auto mt-14 w-[calc(100%-40px)] max-w-[1100px]"
      >
        <SectionHeading
          id="explore-heading"
          title="Explore El-Salam"
          subtitle="Everything about the group, one page at a time"
        />
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {EXPLORE.map((card) => (
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
                  <span lang="ar" dir="rtl" className="block w-fit font-display text-sm text-brand-ink">
                    {card.arabic}
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-3">
                    <span className="font-display text-xl text-forest">{card.title}</span>
                    <span
                      aria-hidden
                      className="grid size-8 shrink-0 place-items-center rounded-full bg-sun text-forest transition group-hover:translate-x-0.5"
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

      {/* ---------------------------------------------------------------- Join */}
      <section id="join" aria-labelledby="join-heading" className="px-5 py-12">
        <div className="reveal relative mx-auto flex max-w-[1100px] flex-col items-start justify-between gap-5 overflow-hidden rounded-3xl bg-sun px-6 py-7 sm:flex-row sm:items-center sm:px-9">
          <Image
            src={logo}
            alt=""
            className="pointer-events-none absolute -right-10 -top-8 w-48 rotate-12 opacity-[0.12] mix-blend-multiply"
          />
          <div className="relative">
            <h2 id="join-heading" className="text-[clamp(22px,3.6vw,28px)] text-maroon">
              Ready to join us?
            </h2>
            <p className="mt-2 max-w-[460px] text-[15px] leading-relaxed text-forest">
              Create your scout account in a minute. Leaders send a request the
              group approves — parent accounts are coming soon.
            </p>
          </div>
          <div className="relative flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <Link
              href="/signup"
              className="rounded-md bg-forest px-6 py-2.5 text-sm font-bold text-cream transition hover:-translate-y-0.5 hover:shadow-lg sm:text-base"
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
