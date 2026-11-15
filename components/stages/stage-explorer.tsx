"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/client";

export type StageCardData = {
  code: string;
  name: string;
  info: {
    promise: string | null;
    about: string | null;
    age_group: string | null;
    vision: string | null;
    mission: string | null;
  };
  leaders: { id: string; name: string; photo: string | null; title: "leader" | "assistant" | null }[];
};

/** Four accents from the site's palette, repeated along the trail. */
const ACCENTS = [
  { bar: "bg-forest", dot: "bg-forest text-sun", chip: "bg-forest/10 text-forest" },
  { bar: "bg-sun", dot: "bg-sun text-forest", chip: "bg-sun/30 text-forest" },
  { bar: "bg-leaf", dot: "bg-leaf text-white", chip: "bg-leaf/15 text-forest" },
  { bar: "bg-maroon", dot: "bg-maroon text-white", chip: "bg-maroon/10 text-maroon" },
] as const;

const two = (n: number) => String(n).padStart(2, "0");

/**
 * The Stages page: the stages laid out as waypoints on a trail, youngest to
 * oldest. Each card is a button — it shows the age group, a line about the
 * stage and its leaders' faces, and opens a pop-up with the promise, about,
 * age group, vision & mission and the leaders (who link to their profiles).
 *
 * The open stage is kept in the address (#ashbal), so a stage can be shared
 * or come back to, and Previous / Next walk along the trail without closing.
 */
export function StageExplorer({ stages }: { stages: StageCardData[] }) {
  const t = useT().features.stageInfo;
  const [open, setOpen] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const show = useCallback(
    (index: number | null) => {
      setOpen(index);
      // Keep the address in step, without adding a history entry per stage.
      const hash = index === null ? "" : `#${stages[index].code}`;
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
    },
    [stages],
  );

  // A link such as /stages#ashbal opens that stage straight away.
  useEffect(() => {
    const fromHash = () => {
      const code = window.location.hash.slice(1);
      const index = stages.findIndex((s) => s.code === code);
      if (index >= 0) setOpen(index);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [stages]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open !== null && !dialog.open) dialog.showModal();
    if (open === null && dialog.open) dialog.close();
    // Each stage starts at the top.
    bodyRef.current?.scrollTo({ top: 0 });
  }, [open]);

  const stage = open !== null ? stages[open] : null;
  const accent = ACCENTS[(open ?? 0) % ACCENTS.length];

  return (
    <>
      {/* The trail's two ends. */}
      <p className="mb-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.14em] text-leaf" aria-hidden>
        <span className="flex items-center gap-1.5">
          <SproutIcon />
          {t.youngest}
        </span>
        <span className="h-0 flex-1 border-t-2 border-dashed border-leaf/40" />
        <span className="flex items-center gap-1.5">
          {t.oldest}
          <TentIcon />
        </span>
      </p>

      <ol className="grid grid-cols-1 gap-x-4 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
        {stages.map((s, i) => {
          const a = ACCENTS[i % ACCENTS.length];
          const shown = s.leaders.slice(0, 3);
          return (
            <li key={s.code} className="reveal relative">
              {/* The dashed trail running behind this row of waypoints. */}
              <span aria-hidden className="absolute -inset-x-2 top-0 border-t-2 border-dashed border-leaf/35" />
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={(e) => {
                  openerRef.current = e.currentTarget;
                  show(i);
                }}
                className="group relative flex h-full w-full cursor-pointer flex-col overflow-visible rounded-2xl border-2 border-line bg-surface-raised text-start shadow-sm transition duration-200 hover:-translate-y-1 hover:border-leaf hover:shadow-lg focus-visible:-translate-y-1 focus-visible:border-leaf focus-visible:shadow-lg focus-visible:outline-none"
              >
                {/* Waypoint: the stage's number, sitting on the trail. */}
                <span
                  aria-hidden
                  className={`absolute start-4 top-0 grid size-12 -translate-y-1/2 place-items-center rounded-full font-display text-base font-bold shadow-md ring-4 ring-cream transition duration-200 group-hover:scale-110 ${a.dot}`}
                >
                  {two(i + 1)}
                </span>
                <span aria-hidden className={`h-1.5 w-full rounded-t-[14px] ${a.bar}`} />

                <span className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-8">
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-display text-2xl leading-tight text-forest">{s.name}</span>
                    {s.info.age_group ? (
                      <span className={`mt-1 shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${a.chip}`}>
                        {s.info.age_group}
                      </span>
                    ) : null}
                  </span>

                  {s.info.about ? (
                    <span className="line-clamp-3 text-sm leading-relaxed text-ink-muted">{s.info.about}</span>
                  ) : null}

                  <span className="mt-auto flex items-center justify-between gap-2 border-t border-dashed border-line pt-3">
                    {shown.length > 0 ? (
                      <span className="flex items-center">
                        <span className="flex -space-x-2 rtl:space-x-reverse">
                          {shown.map((leader) => (
                            <Avatar key={leader.id} name={leader.name} photo={leader.photo} size="sm" />
                          ))}
                        </span>
                        <span className="ms-2 text-xs text-ink-muted">{t.leadersCount(s.leaders.length)}</span>
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="flex items-center gap-1 text-sm font-bold text-forest">
                      {t.details}
                      <span
                        aria-hidden
                        className="inline-block transition duration-200 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
                      >
                        →
                      </span>
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <dialog
        ref={dialogRef}
        aria-labelledby="stage-dialog-title"
        onClose={() => {
          show(null);
          openerRef.current?.focus();
        }}
        onClick={(e) => {
          // A click on the dimmed backdrop (the dialog element itself) closes it.
          if (e.target === e.currentTarget) show(null);
        }}
        className="stage-dialog m-auto max-h-[min(90dvh,860px)] w-[min(720px,calc(100%-24px))] overflow-hidden rounded-3xl bg-surface-raised p-0 text-ink shadow-2xl backdrop:bg-forest/65 backdrop:backdrop-blur-sm"
      >
        {stage ? (
          <div className="flex max-h-[min(90dvh,860px)] flex-col">
            <header className="on-dark relative shrink-0 overflow-hidden bg-forest px-5 pb-5 pt-4 text-cream sm:px-7">
              {/* The stage's number, large and faint, behind the title. */}
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-8 end-4 select-none font-display text-[120px] font-bold leading-none text-white/[0.07]"
              >
                {two((open ?? 0) + 1)}
              </span>
              <div className="relative flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sun">
                    {t.stageOf((open ?? 0) + 1, stages.length)}
                  </p>
                  <h2 id="stage-dialog-title" className="mt-0.5 text-[clamp(26px,5vw,34px)] leading-tight text-white">
                    {stage.name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => show(null)}
                  aria-label={t.close}
                  className="grid size-10 shrink-0 place-items-center rounded-full border border-white/30 text-white transition hover:bg-white/10"
                >
                  <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M5 5l10 10M15 5 5 15" />
                  </svg>
                </button>
              </div>
              <p className="relative mt-3 flex flex-wrap gap-2 text-xs font-bold">
                <span className="flex items-center gap-1.5 rounded-full bg-sun px-3 py-1 text-forest">
                  <CakeIcon />
                  {stage.info.age_group ?? t.ageSoon}
                </span>
                {stage.leaders.length > 0 ? (
                  <span className="rounded-full border border-white/30 px-3 py-1 text-cream">
                    {t.leadersCount(stage.leaders.length)}
                  </span>
                ) : null}
              </p>
            </header>
            <div aria-hidden className={`h-1.5 shrink-0 ${accent.bar === "bg-forest" ? "bg-sun" : accent.bar}`} />

            <div ref={bodyRef} className="space-y-7 overflow-y-auto overscroll-contain px-5 py-6 sm:px-7">
              {stage.info.promise ? (
                <section>
                  <SectionTitle>{t.promise}</SectionTitle>
                  <blockquote className="relative mt-2 rounded-2xl bg-sun/15 px-5 py-4 ps-12 font-display text-lg leading-relaxed text-forest">
                    <span aria-hidden className="absolute start-3 top-1 font-display text-5xl leading-none text-sun">
                      “
                    </span>
                    {stage.info.promise}
                  </blockquote>
                </section>
              ) : null}

              {stage.info.about ? (
                <section>
                  <SectionTitle>{t.about}</SectionTitle>
                  <p className="mt-2 whitespace-pre-line leading-relaxed text-ink">{stage.info.about}</p>
                </section>
              ) : null}

              <section>
                <SectionTitle>{t.ageGroup}</SectionTitle>
                <p className="mt-2 inline-flex items-center gap-2 rounded-xl border-2 border-line bg-surface px-4 py-2 font-display text-lg font-semibold text-forest">
                  <CakeIcon />
                  {stage.info.age_group ?? t.ageSoon}
                </p>
              </section>

              {stage.info.vision || stage.info.mission ? (
                <section className="grid gap-3 sm:grid-cols-2">
                  {stage.info.vision ? (
                    <InfoCard title={t.vision} icon={<EyeIcon />}>
                      {stage.info.vision}
                    </InfoCard>
                  ) : null}
                  {stage.info.mission ? (
                    <InfoCard title={t.mission} icon={<CompassIcon />}>
                      {stage.info.mission}
                    </InfoCard>
                  ) : null}
                </section>
              ) : null}

              <section>
                <SectionTitle>{t.leaders}</SectionTitle>
                {stage.leaders.length === 0 ? (
                  <p className="mt-2 rounded-2xl border-2 border-dashed border-line px-4 py-3 text-sm text-ink-muted">{t.noLeaders}</p>
                ) : (
                  <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    {stage.leaders.map((leader) => (
                      <li key={leader.id}>
                        <Link
                          href={`/leaders/${leader.id}`}
                          className="group/leader flex items-center gap-3 rounded-2xl border-2 border-line bg-surface p-2.5 transition hover:border-leaf hover:bg-leaf/5"
                        >
                          <Avatar name={leader.name} photo={leader.photo} />
                          <span className="min-w-0">
                            <bdi className="block truncate font-semibold text-ink">{leader.name}</bdi>
                            <span
                              className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                leader.title === "leader"
                                  ? "bg-forest text-sun"
                                  : leader.title === "assistant"
                                    ? "bg-sun/40 text-forest"
                                    : "bg-surface-raised text-ink-muted"
                              }`}
                            >
                              {leader.title === "leader" ? t.titleLeader : leader.title === "assistant" ? t.titleAssistant : t.titleMember}
                            </span>
                          </span>
                          <span aria-hidden className="ms-auto text-leaf transition group-hover/leader:translate-x-1 rtl:-scale-x-100 rtl:group-hover/leader:-translate-x-1">
                            →
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {/* Walk along the trail without closing. */}
            <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-line bg-surface px-4 py-3 sm:px-6">
              <StepButton disabled={open === 0} onClick={() => show((open ?? 0) - 1)} label={t.previous} sub={open ? stages[open - 1].name : ""} back />
              <span aria-hidden className="flex gap-1.5">
                {stages.map((s, i) => (
                  <span key={s.code} className={`h-1.5 rounded-full transition-all ${i === open ? "w-5 bg-forest" : "w-1.5 bg-forest/25"}`} />
                ))}
              </span>
              <StepButton
                disabled={open === stages.length - 1}
                onClick={() => show((open ?? 0) + 1)}
                label={t.next}
                sub={open !== null && open < stages.length - 1 ? stages[open + 1].name : ""}
              />
            </footer>
          </div>
        ) : null}
      </dialog>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-leaf">
      <span aria-hidden className="h-4 w-1 rounded-full bg-sun" />
      {children}
    </h3>
  );
}

function InfoCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-line bg-surface p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-maroon">
        <span className="grid size-7 place-items-center rounded-full bg-maroon/10">{icon}</span>
        {title}
      </h3>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">{children}</p>
    </div>
  );
}

function StepButton({
  label,
  sub,
  onClick,
  disabled,
  back = false,
}: {
  label: string;
  sub: string;
  onClick: () => void;
  disabled: boolean;
  back?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={sub ? `${label}: ${sub}` : label}
      className={`flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm font-bold text-forest transition hover:bg-leaf/10 disabled:invisible ${
        back ? "" : "flex-row-reverse text-end"
      }`}
    >
      <span aria-hidden className={`inline-block ${back ? "rtl:-scale-x-100" : "-scale-x-100 rtl:scale-x-100"}`}>
        ←
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{label}</span>
        <span className="block truncate">{sub}</span>
      </span>
    </button>
  );
}

const iconProps = {
  "aria-hidden": true,
  viewBox: "0 0 20 20",
  className: "size-4 shrink-0",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function SproutIcon() {
  return (
    <svg {...iconProps}>
      <path d="M10 17V9M10 9C10 6 8 4 4.5 4c0 3.2 2 5 5.5 5ZM10 11c0-2.6 1.8-4.4 5.5-4.4 0 3-2 4.4-5.5 4.4Z" />
    </svg>
  );
}

function TentIcon() {
  return (
    <svg {...iconProps}>
      <path d="M10 3.5 2.5 16.5h15L10 3.5ZM10 3.5v13M7.5 16.5 10 11l2.5 5.5" />
    </svg>
  );
}

function CakeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 16.5v-5a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 16 11.5v5M2.5 16.5h15M10 10V7M10 4.2v.3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10Z" />
      <circle cx="10" cy="10" r="2.3" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="m12.8 7.2-1.6 4-4 1.6 1.6-4 4-1.6Z" />
    </svg>
  );
}

export function Avatar({ name, photo, size = "md" }: { name: string; photo: string | null; size?: "sm" | "md" | "xl" }) {
  const box =
    size === "xl" ? "size-36 text-4xl ring-2 ring-sun" : size === "sm" ? "size-7 text-[10px] ring-2 ring-cream" : "size-12 text-base ring-2 ring-sun";
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element -- our own already-sized WebP
    return <img src={photo} alt="" className={`${box} shrink-0 rounded-full object-cover`} />;
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return (
    <span aria-hidden className={`${box} grid shrink-0 place-items-center rounded-full bg-forest font-display font-bold text-sun`}>
      {initials}
    </span>
  );
}
