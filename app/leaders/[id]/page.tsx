import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { Avatar } from "@/components/stages/stage-explorer";
import { getPublicLeaders } from "@/lib/leaders";
import { getT } from "@/lib/i18n/server";

const UUID = /^[0-9a-f-]{36}$/i;

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M3 7.5 7.5 11 12 4l4.5 7L21 7.5 19 18H5L3 7.5ZM5 19.5h14V21H5v-1.5Z" />
    </svg>
  );
}

async function findLeader(id: string) {
  if (!UUID.test(id)) return null;
  return (await getPublicLeaders()).find((l) => l.id === id) ?? null;
}

export async function generateMetadata({ params }: PageProps<"/leaders/[id]">): Promise<Metadata> {
  const leader = await findLeader((await params).id);
  const t = (await getT()).features.leaderProfile;
  return {
    title: leader ? leader.name : t.notFound,
    // A leader chose to be seen on the site, not to be found on Google.
    robots: { index: false, follow: true },
  };
}

/** A leader's public profile — only for leaders who switched it on (0028). */
export default async function LeaderPage({ params }: PageProps<"/leaders/[id]">) {
  const leader = await findLeader((await params).id);
  if (!leader) notFound();
  const all = await getT();
  const t = all.features.leaderProfile;
  const stageName = (code: string) => all.stages[code as keyof typeof all.stages] ?? code;
  const committeeNames = all.members.leaders.committeeNames as Record<string, string>;

  const facts: { label: string; value: string }[] = [];
  if (leader.age !== null) facts.push({ label: t.age, value: t.years(leader.age) });
  facts.push({
    label: t.education,
    value: `${leader.faculty} · ${leader.university}${leader.graduate ? ` (${t.graduate})` : ""}`,
  });
  if (leader.joinYear) facts.push({ label: t.joined, value: String(leader.joinYear) });

  return (
    <SiteShell>
      <section className="on-dark relative overflow-hidden bg-forest text-cream">
        <div className="relative mx-auto flex w-[calc(100%-40px)] max-w-[900px] flex-col items-center gap-5 py-10 text-center sm:flex-row sm:items-end sm:text-start">
          {leader.isOwner ? (
            <span className="relative shrink-0">
              <span aria-hidden className="absolute -inset-2 rounded-full bg-[conic-gradient(from_0deg,var(--color-sun),#fff3a8,var(--color-sun),#e0b400,var(--color-sun))] opacity-90" />
              <span className="relative block rounded-full ring-4 ring-forest">
                <Avatar name={leader.name} photo={leader.photo} size="xl" />
              </span>
              <span
                aria-hidden
                className="absolute -top-3 start-1/2 grid size-11 -translate-x-1/2 place-items-center rounded-full bg-sun text-forest shadow-lg ring-4 ring-forest rtl:translate-x-1/2"
              >
                <CrownIcon className="size-6" />
              </span>
            </span>
          ) : (
            <Avatar name={leader.name} photo={leader.photo} size="xl" />
          )}
          <div className="min-w-0">
            {leader.isOwner ? (
              <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-sun px-3.5 py-1.5 text-sm font-bold text-forest shadow-md">
                <CrownIcon className="size-4" />
                {t.owner}
              </p>
            ) : null}
            <p className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-sun">{leader.isOwner ? t.ownerNote : t.eyebrow}</p>
            <h1 className="mt-1 text-[clamp(26px,4.5vw,38px)] leading-tight text-white">
              <bdi>{leader.name}</bdi>
            </h1>
            <ul className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {leader.stages.map((code) => {
                const title = leader.titles.find((x) => x.stage === code)?.title;
                return (
                  <li key={code} className="rounded-full border border-sun/50 bg-white/5 px-3 py-1 text-sm font-semibold text-cream">
                    {title === "leader" ? t.titleLeader(stageName(code)) : title === "assistant" ? t.titleAssistant(stageName(code)) : t.serves(stageName(code))}
                  </li>
                );
              })}
              {leader.committees.map((code) => (
                <li key={`c-${code}`} className="rounded-full bg-leaf px-3 py-1 text-sm font-semibold text-white">
                  {t.committee(committeeNames[code] ?? code)}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div aria-hidden className="h-1.5 bg-sun" />
      </section>

      <div className="mx-auto w-[calc(100%-40px)] max-w-[900px] py-10">
        <dl className="grid gap-3 sm:grid-cols-3">
          {facts.map((fact) => (
            <div key={fact.label} className="rounded-2xl border-2 border-line bg-surface-raised p-4">
              <dt className="text-xs font-bold uppercase tracking-wider text-leaf">{fact.label}</dt>
              <dd className="mt-1 font-semibold text-ink">
                <bdi>{fact.value}</bdi>
              </dd>
            </div>
          ))}
        </dl>

        {leader.about ? (
          <section className="mt-8">
            <h2 className="text-xl text-maroon">{t.about}</h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-ink">
              <bdi>{leader.about}</bdi>
            </p>
          </section>
        ) : null}

        <p className="mt-10">
          <Link href={leader.stages[0] ? `/stages#${leader.stages[0]}` : "/stages"} className="text-sm font-semibold text-brand-ink underline-offset-4 hover:underline">
            <span aria-hidden className="inline-block rtl:-scale-x-100">←</span> {t.back}
          </Link>
        </p>
      </div>
    </SiteShell>
  );
}
