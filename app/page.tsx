import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { SiteShell } from "@/components/site-shell";
import { HeroSlider } from "@/components/landing/hero-slider";
import {
  ACTIVITIES,
  FOUNDED,
  HERO_SLIDES,
  MILESTONES,
  STATS,
} from "@/lib/site-content";
import rope from "@/public/images/rope.jpg";

export const metadata: Metadata = {
  title: "El-Salam Scouting Group",
  description:
    "El-Salam Scouting Group — over 400 scouts, leaders and families building character, service and friendship since 1977.",
};

/* Colour notes for anyone editing this page — the design used yellow in two
   places where it can't be read, and both were changed:
     • text ON yellow is forest (8.18:1), not white (1.34:1)
     • headings ON the cream are maroon (7.54:1), not yellow (1.28:1)
   Yellow headings survive only on the green band, where they are large
   enough (36px) for the 3:1 that large text needs; they measure 3.82:1. */

const years = new Date().getFullYear() - FOUNDED;
const yearsInWords =
  years >= 55 ? "Nearly sixty" : years >= 45 ? "Nearly fifty" : `${years}`;

export default function HomePage() {
  return (
    <SiteShell>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative h-[min(78vw,560px)] w-full overflow-hidden bg-forest">
        <HeroSlider slides={HERO_SLIDES} />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[35%] bg-linear-to-t from-black/45 to-transparent"
        />
        <div className="pointer-events-none absolute left-1/2 top-[80%] z-10 w-full -translate-x-1/2 -translate-y-1/2 px-4 text-center">
          <h1>
            <span className="mb-2.5 block whitespace-nowrap font-sans text-[clamp(0.95rem,4.7vw,40px)] leading-none tracking-[-0.02em] text-white [text-shadow:0_1px_10px_rgb(0_0_0/0.45)]">
              Character, Service &amp; Friendship
            </span>
            <span className="block font-display text-[clamp(2.15rem,12vw,64px)] leading-none text-white [text-shadow:2px_0_var(--color-sun),-2px_0_var(--color-sun),0_2px_var(--color-sun),0_-2px_var(--color-sun)]">
              SINCE {FOUNDED}
            </span>
          </h1>
        </div>
      </section>

      {/* --------------------------------------------------------------- Intro */}
      <section className="mx-auto mt-8 w-[calc(100%-40px)] max-w-[760px]">
        <p className="text-[clamp(20px,4vw,30px)] leading-snug text-[#141414]">
          El-Salam Scouting Group brings together more than 400 scouts, leaders
          and families. We hike, camp, serve our community — and grow up a
          little braver for it.
        </p>
      </section>

      {/* --------------------------------------------------------------- Stats */}
      <dl className="mx-auto mt-8 grid w-[calc(100%-40px)] max-w-[760px] grid-cols-2 gap-3">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col-reverse rounded-2xl border-2 border-sun px-3 py-6 text-center"
          >
            <dt className="mt-2 text-[15px] font-medium text-leaf">{stat.label}</dt>
            <dd className="font-display text-[clamp(32px,8vw,48px)] font-semibold leading-none text-leaf">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* ------------------------------------------------------ Register banner */}
      <section className="mx-auto mt-8 w-[calc(100%-40px)] max-w-[760px] rounded-2xl bg-sun px-6 py-8 text-center text-forest">
        <p className="text-[clamp(18px,3vw,22px)] font-medium leading-tight">
          New season registration is currently available
        </p>
        <Link
          href="/signup"
          className="mt-5 inline-block rounded-md bg-leaf px-7 py-3 font-bold text-white transition hover:opacity-90"
        >
          Join Us
        </Link>
      </section>

      {/* ------------------------------------------------------------- History */}
      <section
        id="history"
        aria-labelledby="history-heading"
        className="mx-auto mt-12 w-[calc(100%-40px)] max-w-[760px] pb-4"
      >
        <h2
          id="history-heading"
          className="text-[clamp(28px,6vw,36px)] text-maroon"
        >
          Our History
        </h2>
        <p className="mt-3 text-[clamp(20px,4vw,26px)] font-medium leading-tight text-leaf">
          {yearsInWords} years in the same neighbourhood
        </p>
        <p className="mt-3 leading-relaxed text-[#141414]">
          What began as one troop in a borrowed hall is now six sections and
          hundreds of families. The uniform has changed; the promise hasn&apos;t.
        </p>

        {/* The rope is decoration: the milestones are a real ordered list, so
            a screen reader hears them in date order regardless of which side
            of the rope each one sits on. */}
        <div className="relative mx-auto mt-10 max-w-[832px]">
          <Image
            src={rope}
            alt=""
            className="pointer-events-none absolute left-1/2 top-0 z-0 h-full w-[72px] max-w-[22vw] -translate-x-1/2 object-fill mix-blend-multiply md:w-[88px]"
          />
        <ol className="relative grid grid-cols-[1fr_72px_1fr] gap-x-1.5 md:grid-cols-[1fr_88px_1fr] md:gap-x-3">
          {MILESTONES.map((m, i) => {
            const right = i % 2 === 0;
            return (
              <li
                key={m.year}
                style={{ gridRow: i + 1 }}
                // Each milestone overlaps the one before it by ~60px, on the
                // opposite side of the rope — the zigzag in the design, and
                // it keeps the list from running a full phone-screen tall.
                className={`relative z-10 flex min-h-[136px] flex-col justify-center ${
                  i > 0 ? "-mt-14 sm:-mt-16" : ""
                } ${
                  right
                    ? "col-start-3 pl-1.5 text-left"
                    : "col-start-1 pr-1.5 text-right"
                }`}
              >
                <p className="font-display text-[22px] font-semibold text-maroon">
                  {m.year}
                </p>
                <h3 className="mt-1 font-sans text-lg font-bold text-[#141414]">
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

      {/* ---------------------------------------------------------- Activities */}
      <section
        aria-labelledby="activities-heading"
        className="on-dark mt-10 bg-leaf px-5 pb-12 pt-10"
      >
        <div className="mx-auto max-w-[1000px]">
          <h2
            id="activities-heading"
            className="text-[clamp(28px,6vw,36px)] text-sun"
          >
            Our Activities
          </h2>
          {/* Never below 24px: butter on this green is 4.38:1, which passes only
              as large text (3:1). At the design's 20px mobile size it failed. */}
          <p className="mt-3 text-[clamp(24px,4vw,26px)] font-medium leading-tight text-butter">
            Where the learning actually happens
          </p>
          <p className="mt-3 max-w-[640px] leading-relaxed text-cream">
            Weekend hikes, summer camps and service projects — a look at what a
            year with El-Salam involves.
          </p>
          <div className="mt-5 flex justify-end">
            <Link
              href="/gallery"
              className="rounded-md bg-sun px-[22px] py-2.5 text-[15px] font-bold text-forest transition hover:opacity-90"
            >
              See All
            </Link>
          </div>
          <ul className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
            {ACTIVITIES.map((photo) => (
              <li key={photo.name}>
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  placeholder="blur"
                  sizes="(min-width: 1024px) 330px, 50vw"
                  className="aspect-4/3 w-full rounded-lg object-cover"
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------------------- Join */}
      <section id="join" aria-labelledby="join-heading" className="px-5 pb-10 pt-8">
        <div className="mx-auto flex max-w-[1000px] flex-col items-start justify-between gap-4 rounded-3xl bg-sun px-6 py-7 sm:flex-row sm:items-center">
          <div>
            <h2
              id="join-heading"
              className="text-[clamp(22px,5vw,30px)] text-maroon"
            >
              Ready to join us?
            </h2>
            <p className="mt-3 max-w-[440px] text-sm leading-relaxed text-forest">
              Create your scout account in a minute. Leaders send a request the
              group approves — parent accounts are coming soon.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <Link
              href="/signup"
              className="rounded-md border-2 border-forest px-[26px] py-3 font-bold text-forest transition hover:bg-forest/10"
            >
              Sign Up
            </Link>
            <p className="text-sm leading-snug text-maroon">
              Already have an account?{" "}
              <Link href="/login" className="underline underline-offset-2">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
