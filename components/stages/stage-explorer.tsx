"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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

/**
 * The stage cards on /stages. Each one is a button: hovering shows that it
 * opens, and clicking opens a pop-up with the stage's promise, about, age
 * group, vision & mission, and its leaders (who link to their profiles).
 */
export function StageExplorer({ stages }: { stages: StageCardData[] }) {
  const t = useT().features.stageInfo;
  const [open, setOpen] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open !== null && !dialog.open) dialog.showModal();
    if (open === null && dialog.open) dialog.close();
  }, [open]);

  const stage = open !== null ? stages[open] : null;

  return (
    <>
      <ol className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-4">
        {stages.map((s, i) => (
          <li key={s.code} className="reveal">
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={(e) => {
                openerRef.current = e.currentTarget;
                setOpen(i);
              }}
              className="group relative flex w-full cursor-pointer items-center gap-3 rounded-xl border-2 border-line bg-surface-raised p-4 text-start transition hover:-translate-y-0.5 hover:border-leaf hover:shadow-md focus-visible:border-leaf focus-visible:outline-none"
            >
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-full bg-forest font-display text-sm font-semibold text-sun transition group-hover:bg-sun group-hover:text-forest"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg leading-tight text-forest">{s.name}</span>
                {/* Always shown on touch screens; on a mouse it appears on hover. */}
                <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-leaf transition [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-visible:opacity-100">
                  {t.clickHint}
                  <span aria-hidden className="inline-block rtl:-scale-x-100">→</span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <dialog
        ref={dialogRef}
        aria-labelledby="stage-dialog-title"
        onClose={() => {
          setOpen(null);
          openerRef.current?.focus();
        }}
        onClick={(e) => {
          // A click on the dimmed backdrop (the dialog element itself) closes it.
          if (e.target === e.currentTarget) setOpen(null);
        }}
        className="m-auto max-h-[min(88dvh,820px)] w-[min(680px,calc(100%-24px))] overflow-hidden rounded-3xl bg-surface-raised p-0 text-ink shadow-2xl backdrop:bg-forest/60 backdrop:backdrop-blur-sm"
      >
        {stage ? (
          <div className="flex max-h-[min(88dvh,820px)] flex-col">
            <header className="on-dark relative flex items-center gap-3 bg-forest px-5 py-4 text-cream sm:px-6">
              <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-sun font-display text-sm font-bold text-forest">
                {String((open ?? 0) + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sun">{t.eyebrow}</p>
                <h2 id="stage-dialog-title" className="text-2xl leading-tight text-white">
                  {stage.name}
                </h2>
              </div>
              {stage.info.age_group ? (
                <span className="hidden shrink-0 rounded-full border border-sun/60 px-3 py-1 text-xs font-bold text-sun sm:inline">
                  {stage.info.age_group}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(null)}
                aria-label={t.close}
                className="grid size-9 shrink-0 place-items-center rounded-full border border-white/30 text-white transition hover:bg-white/10"
              >
                <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M5 5l10 10M15 5 5 15" />
                </svg>
              </button>
            </header>
            <div aria-hidden className="h-1 shrink-0 bg-sun" />

            <div className="space-y-6 overflow-y-auto px-5 py-6 sm:px-7">
              {stage.info.promise ? (
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-leaf">{t.promise}</h3>
                  <blockquote className="mt-2 rounded-2xl border-s-4 border-sun bg-sun/10 px-4 py-3 font-display text-lg leading-relaxed text-forest">
                    “{stage.info.promise}”
                  </blockquote>
                </section>
              ) : null}

              {stage.info.about ? (
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-leaf">{t.about}</h3>
                  <p className="mt-2 whitespace-pre-line leading-relaxed text-ink">{stage.info.about}</p>
                </section>
              ) : null}

              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-leaf">{t.ageGroup}</h3>
                <p className="mt-2 inline-flex rounded-full bg-forest px-3.5 py-1 text-sm font-bold text-sun">
                  {stage.info.age_group ?? t.ageSoon}
                </p>
              </section>

              {stage.info.vision || stage.info.mission ? (
                <section className="grid gap-3 sm:grid-cols-2">
                  {stage.info.vision ? (
                    <div className="rounded-2xl border border-line bg-surface p-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-maroon">{t.vision}</h3>
                      <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink">{stage.info.vision}</p>
                    </div>
                  ) : null}
                  {stage.info.mission ? (
                    <div className="rounded-2xl border border-line bg-surface p-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-maroon">{t.mission}</h3>
                      <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink">{stage.info.mission}</p>
                    </div>
                  ) : null}
                </section>
              ) : null}

              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-leaf">{t.leaders}</h3>
                {stage.leaders.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-muted">{t.noLeaders}</p>
                ) : (
                  <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    {stage.leaders.map((leader) => (
                      <li key={leader.id}>
                        <Link
                          href={`/leaders/${leader.id}`}
                          className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-2.5 transition hover:border-leaf hover:bg-leaf/5"
                        >
                          <Avatar name={leader.name} photo={leader.photo} />
                          <span className="min-w-0">
                            <bdi className="block truncate font-semibold text-ink">{leader.name}</bdi>
                            <span className="block text-xs text-ink-muted">
                              {leader.title === "leader" ? t.titleLeader : leader.title === "assistant" ? t.titleAssistant : t.titleMember}
                            </span>
                          </span>
                          <span aria-hidden className="ms-auto text-leaf rtl:-scale-x-100">→</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}

export function Avatar({ name, photo, size = "md" }: { name: string; photo: string | null; size?: "md" | "xl" }) {
  const box = size === "xl" ? "size-36 text-4xl" : "size-12 text-base";
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element -- our own already-sized WebP
    return <img src={photo} alt="" className={`${box} shrink-0 rounded-full object-cover ring-2 ring-sun`} />;
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return (
    <span aria-hidden className={`${box} grid shrink-0 place-items-center rounded-full bg-forest font-display font-bold text-sun ring-2 ring-sun`}>
      {initials}
    </span>
  );
}
