import Image from "next/image";
import { SectionHeading } from "@/components/landing/section-heading";
import { GoalIcon } from "@/components/landing/about-icons";
import {
  ABOUT_POINTS,
  BRANCHES,
  FOUNDED,
  GOALS,
  SCOUTING_FACTS,
  SEASON,
  WIDER_SCOUTING,
} from "@/lib/site-content";
import teamPhoto from "@/public/images/slide-10.jpg";

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
export function AboutUs() {
  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="mx-auto mt-14 grid w-[calc(100%-40px)] max-w-[1100px] gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12"
    >
      <div>
        <SectionHeading
          id="about-heading"
          title="About Us"
          subtitle={`One of Egypt's oldest scout groups — since ${FOUNDED}`}
        />
        <div className="mt-4 space-y-3 text-[16px] leading-relaxed text-[#141414]/85">
          <p>
            El-Salam Scout Group has been spreading Scouting since {FOUNDED}. It
            began in Tanta, where its oldest home still stands, and grew into one
            of the most respected scout groups in Egypt and the Arab world.
          </p>
          <p>
            Taking responsibility is one of Scouting&apos;s first lessons, and
            we took it to heart. Rather than stay in one city, El-Salam carried
            Scouting to young people wherever they gather — sports clubs, youth
            centres, and public and private schools across Egypt. When schools
            asked us to stay for good, we stayed.
          </p>
          <p>
            Today our teams shine across Egypt and around the world, and the
            need has never been greater: a generation that learns to work as a
            team, stand out, and serve the people around it.
          </p>
        </div>
        <ul className="mt-5 space-y-2.5">
          {ABOUT_POINTS.map((point) => (
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
            alt="Young El-Salam leaders posing as a team under a tree"
            fill
            placeholder="blur"
            sizes="(min-width: 1024px) 520px, 100vw"
            quality={90}
            className="object-cover object-[50%_20%]"
          />
          <span className="absolute left-3 top-3 rounded-full bg-sun px-3 py-1 text-sm font-bold text-forest shadow">
            Since {FOUNDED}
          </span>
        </div>
        <div className="rounded-2xl border-2 border-line bg-surface-raised p-5">
          <h3 className="font-display text-lg text-maroon">Where we meet</h3>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {BRANCHES.map((branch) => (
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
export function OurGoals() {
  return (
    <section aria-labelledby="goals-heading" className="mt-14 bg-surface py-12">
      <div className="mx-auto w-[calc(100%-40px)] max-w-[1100px]">
        <SectionHeading
          id="goals-heading"
          title="Our Goals"
          subtitle="What every meeting, camp and trip is for"
        />
        <ol className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GOALS.map((goal, i) => (
            <li
              key={goal.title}
              className="reveal group relative overflow-hidden rounded-2xl border-2 border-line bg-surface-raised p-5 transition hover:-translate-y-1 hover:border-leaf hover:shadow-lg"
            >
              {/* Big faint number, drawn by CSS (::before) so it is pure
                  decoration — the list is already numbered for screen readers. */}
              <span
                aria-hidden
                data-n={String(i + 1).padStart(2, "0")}
                className="absolute right-3 top-1 font-display text-[56px] font-extrabold leading-none text-butter/70 before:content-[attr(data-n)]"
              />
              <span className="relative grid size-12 place-items-center rounded-full bg-sun text-forest transition group-hover:rotate-6">
                <GoalIcon name={goal.icon} />
              </span>
              <h3 className="relative mt-3 text-lg font-bold text-forest">{goal.title}</h3>
              <p className="relative mt-1 text-[15px] leading-relaxed text-ink-muted">{goal.body}</p>
            </li>
          ))}
        </ol>

        {/* A season with El-Salam */}
        <div className="mt-12 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <h3 className="font-display text-[clamp(20px,3vw,24px)] text-maroon">A season with El-Salam</h3>
            <p className="mt-1 text-[15px] text-ink-muted">
              The fixed points every branch shares, every year.
            </p>
            <ol className="relative mt-5 space-y-3 border-l-2 border-sun pl-6">
              {SEASON.map((item) => (
                <li key={item.title} className="reveal relative">
                  <span
                    aria-hidden
                    className="absolute -left-[33px] top-1.5 size-4 rounded-full border-4 border-surface bg-leaf"
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
            <h3 className="font-display text-xl text-sun">Beyond our group</h3>
            <p className="mt-1 text-sm text-cream/80">Each year, as the annual plan allows, we take part in:</p>
            <ul className="mt-4 space-y-2.5">
              {WIDER_SCOUTING.map((item) => (
                <li key={item} className="flex gap-2.5 text-[15px] leading-snug">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-sun" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-cream/15 pt-4 text-sm leading-relaxed text-cream/80">
              Our programmes are refreshed every season by members who are
              specialists in their own fields — always true to the foundations
              of Scouting.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------- About Scouting --
export function AboutScouting() {
  return (
    <section aria-labelledby="scouting-heading" className="on-dark relative overflow-hidden bg-forest py-14 text-cream">
      <div aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-sun" />
      <div className="mx-auto grid w-[calc(100%-40px)] max-w-[1100px] gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-butter">About Scouting</p>
          <h2 id="scouting-heading" className="mt-2 text-[clamp(26px,4.5vw,36px)] leading-tight text-sun">
            The world&apos;s leading educational youth movement
          </h2>
          <div className="mt-4 space-y-3 text-[16px] leading-relaxed text-cream/90">
            <p>
              Scouting is a worldwide educational movement for young people —
              non-political and open to everyone. Its aim is to raise good
              citizens: leaders who love teamwork, make a difference through
              their conduct and character, and can get along with anyone while
              staying true to themselves.
            </p>
            <p>
              Scouts learn by doing. Values are built and habits corrected
              through camps, life outdoors and regular activities — not
              lectures. In Egypt, Scouting has shaped ministers, scientists and
              public figures in every field.
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          {SCOUTING_FACTS.map((fact) => (
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
