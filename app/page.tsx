import Link from "next/link";
import type { Metadata } from "next";
import { SiteShell } from "@/components/site-shell";
import { CampGallery } from "@/components/landing/camp-gallery";

export const metadata: Metadata = {
  title: "El-Salam Scouting Group",
  description:
    "El-Salam Scouting Group — over 400 scouts, leaders and families building character, service and friendship.",
};

/* ---------------------------------------------------------------------------
 * NOTE: the history copy and figures below are placeholders written to the
 * right shape and length. Replace them with the group's real dates and
 * numbers before this goes public.
 * ------------------------------------------------------------------------- */

const STATS = [
  { value: "400+", label: "Active members" },
  { value: "6", label: "Sections" },
  { value: "1968", label: "Founded" },
  { value: "50+", label: "Camps a year" },
];

const MILESTONES = [
  {
    year: "1968",
    title: "The first troop",
    body: "El-Salam begins with a single troop of twenty scouts meeting in a borrowed hall, led by volunteers from the neighbourhood.",
  },
  {
    year: "1985",
    title: "A permanent home",
    body: "The group opens its own scout house, giving every section a place to store kit and plan expeditions year-round.",
  },
  {
    year: "2004",
    title: "Growing the sections",
    body: "Cubs and Rovers are added alongside the original troop, opening the group to a much wider range of ages.",
  },
  {
    year: "2026",
    title: "Going digital",
    body: "Records move off spreadsheets and paper into a single membership system, so leaders spend their time on scouting rather than admin.",
  },
];

export default function HomePage() {
  return (
    <SiteShell>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-b from-brand-50 to-canvas dark:from-brand-950/40 dark:to-canvas"
        />
        <div
          aria-hidden
          className="absolute -right-24 -top-24 size-96 rounded-full bg-brand-200/40 blur-3xl dark:bg-brand-800/20"
        />

        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-200">
              <span
                aria-hidden
                className="size-1.5 rounded-full bg-accent-500"
              />
              Registrations are open for the new season
            </span>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink sm:text-6xl">
              Character, service and friendship
              <span className="block text-brand-700 dark:text-brand-300">
                since 1968
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-lg text-ink-muted">
              El-Salam Scouting Group brings together more than 400 scouts,
              leaders and families. We hike, camp, serve our community — and
              grow up a little braver for it.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                Join the group
              </Link>
              <Link
                href="#history"
                className="rounded-lg border border-line bg-canvas px-5 py-3 text-sm font-semibold text-ink transition hover:border-brand-300"
              >
                Our history
              </Link>
            </div>
          </div>

          <dl className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="bg-canvas px-4 py-5">
                <dt className="text-xs uppercase tracking-wider text-ink-subtle">
                  {stat.label}
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-ink">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ------------------------------------------------------------- History */}
      <section
        id="history"
        aria-labelledby="history-heading"
        className="py-16 sm:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,26rem)_1fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
                Our history
              </p>
              <h2
                id="history-heading"
                className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
              >
                Nearly sixty years in the same neighbourhood
              </h2>
              <p className="mt-4 text-ink-muted">
                What began as one troop in a borrowed hall is now six sections
                and hundreds of families. The uniform has changed; the promise
                hasn&apos;t.
              </p>
            </div>

            <ol className="relative space-y-8 border-l border-line pl-6">
              {MILESTONES.map((milestone) => (
                <li key={milestone.year} className="relative">
                  <span
                    aria-hidden
                    className="absolute -left-[1.9rem] top-1.5 grid size-3 place-items-center rounded-full border-2 border-canvas bg-brand-600"
                  />
                  <p className="font-mono text-xs font-medium text-brand-700 dark:text-brand-300">
                    {milestone.year}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-ink">
                    {milestone.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-ink-muted">
                    {milestone.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- Gallery */}
      <CampGallery />

      {/* ---------------------------------------------------------------- Join */}
      <section
        id="join"
        aria-labelledby="join-heading"
        className="py-16 sm:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-2xl border border-line bg-linear-to-br from-brand-700 to-brand-900 px-6 py-12 text-center sm:px-12">
            <h2
              id="join-heading"
              className="text-3xl font-semibold tracking-tight text-white sm:text-4xl"
            >
              Ready to join us?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-100">
              Create your scout account in a minute. Leaders join with an
              invite code from the group — parent accounts are coming soon.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/signup"
                className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-brand-800 shadow-sm transition hover:bg-brand-50"
              >
                Create an account
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
