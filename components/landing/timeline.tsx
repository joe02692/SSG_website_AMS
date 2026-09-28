"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Photo } from "@/components/gallery/photo";
import { PillIcon } from "@/components/history/icons";
import { LIGHT_DISMISS, lightDismissFallback } from "@/components/ui/dialog-utils";
import type { Camp, MilestoneIcon } from "@/lib/site-content";

export type CampPhoto = { publicId: string; width: number; height: number };

export type RopeEntry =
  | {
      kind: "milestone";
      key: string;
      year: number;
      title: string;
      body: string;
      icon: MilestoneIcon;
    }
  | ({ kind: "camp"; key: string; photos: CampPhoto[] } & Camp);

/**
 * The History page's rope: the group's milestones and every camp, oldest at
 * the top, knotted onto a braided cord in the group's colours.
 *
 * A camp with photos is a button that opens them in a viewer right here;
 * one without says so. The rope and knots are decoration — the entries are
 * a real ordered list, so a screen reader hears them in date order whichever
 * side each sits on.
 *
 * Phones: the rope runs down the left, every entry to its right. From sm up
 * entries alternate sides, each tucked ~40px under the one before.
 */
export function Timeline({ entries }: { entries: RopeEntry[] }) {
  const [open, setOpen] = useState<Extract<RopeEntry, { kind: "camp" }> | null>(null);

  return (
    <div className="relative mx-auto mt-10 max-w-[880px]">
      {/* The rope itself: a braided stripe, shaded to look round. */}
      <div
        aria-hidden
        className="rope absolute bottom-0 left-[13px] top-2 w-[14px] rounded-full sm:left-1/2 sm:w-[18px] sm:-translate-x-1/2"
      />
      <ol className="relative">
        {entries.map((entry, i) => {
          const right = i % 2 === 1;
          return (
            <li
              key={entry.key}
              className={`reveal relative grid grid-cols-[40px_1fr] gap-x-3 pb-9 sm:grid-cols-[1fr_72px_1fr] sm:gap-x-0 sm:pb-0 ${
                i > 0 ? "sm:-mt-10" : ""
              } ${i === entries.length - 1 ? "pb-0 sm:pb-4" : ""}`}
            >
              <span
                aria-hidden
                className="col-start-1 row-start-1 flex justify-center pt-px sm:col-start-2 sm:-mt-[3px] sm:pt-0"
              >
                <Knot />
              </span>
              <div
                className={`relative col-start-2 row-start-1 min-w-0 pl-7 sm:max-w-[380px] ${
                  right
                    ? "sm:col-start-3 sm:pl-12"
                    : "sm:col-start-1 sm:w-full sm:justify-self-end sm:pl-0 sm:pr-1"
                }`}
              >
                {/* Knot-to-pill line: always on phones, and on the right-hand side. */}
                <Tie
                  className={`absolute -left-3 top-[19px] w-9 sm:w-14 ${right ? "" : "sm:hidden"}`}
                />
                <PillRow entry={entry} side={right ? "right" : "left"} />
                {entry.kind === "milestone" ? (
                  <>
                    <h3 className="mt-2.5 font-sans text-lg font-bold text-forest">{entry.title}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-[#141414]/80">{entry.body}</p>
                  </>
                ) : (
                  <CampCard camp={entry} onOpen={() => setOpen(entry)} />
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <CampViewer camp={open} onClose={() => setOpen(null)} />
    </div>
  );
}

/** The yellow line (and dot) tying an entry to its knot. */
function Tie({ className }: { className: string }) {
  return (
    <span aria-hidden className={`h-0.5 bg-sun/80 ${className}`}>
      <span className="absolute -left-1 top-1/2 size-2 -translate-y-1/2 rounded-full bg-sun" />
    </span>
  );
}

/** The year pill. On the left-hand side (sm+) its line runs out to the knot. */
function PillRow({ entry, side }: { entry: RopeEntry; side: "left" | "right" }) {
  const icon =
    entry.kind === "milestone" ? entry.icon : entry.season === "Summer" ? "sun" : "snow";
  return (
    <div className="flex items-center">
      <p className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-butter px-3.5 py-1.5 font-display text-lg font-bold text-forest shadow-sm">
        {entry.year}
        <PillIcon name={icon} />
        {entry.kind === "camp" ? (
          <span className="text-sm font-semibold">{entry.season}</span>
        ) : null}
      </p>
      {side === "left" ? (
        <span aria-hidden className="relative -mr-4 ml-3 hidden h-0.5 flex-1 bg-sun/80 sm:block">
          <span className="absolute -right-1 top-1/2 size-2 -translate-y-1/2 rounded-full bg-sun" />
        </span>
      ) : null}
    </div>
  );
}

function CampCard({
  camp,
  onOpen,
}: {
  camp: Extract<RopeEntry, { kind: "camp" }>;
  onOpen: () => void;
}) {
  const heading = (
    <>
      <span className="block font-sans text-lg font-bold text-forest">
        {camp.season} Camp · {camp.place}
      </span>
      <span lang="ar" dir="rtl" className="block w-fit font-display text-sm text-brand-ink">
        {camp.season === "Summer" ? "معسكر صيفي" : "معسكر شتوي"} · {camp.placeAr}
      </span>
    </>
  );

  if (camp.photos.length === 0) {
    return (
      <div className="mt-2.5">
        <h3>{heading}</h3>
        <p className="mt-2 inline-flex items-center gap-2 rounded-lg border-2 border-dashed border-line px-3 py-1.5 text-sm text-ink-muted">
          <svg aria-hidden viewBox="0 0 20 20" className="size-4 fill-current">
            <path d="M4 5h2.2l1.2-1.6h5.2L13.8 5H16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm6 2.5a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z" />
          </svg>
          Photos coming soon
        </p>
      </div>
    );
  }

  const cover = camp.photos[0];
  return (
    <div className="mt-2.5">
      <h3>{heading}</h3>
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-label={`See ${camp.photos.length} photos from ${camp.season} Camp ${camp.year}, ${camp.place}`}
        className="group relative mt-2.5 block aspect-[2/1] w-full overflow-hidden rounded-xl bg-forest shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <Photo
          source={{ kind: "cloudinary", ...cover }}
          alt=""
          sizes="(min-width: 640px) 360px, 90vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <span aria-hidden className="absolute inset-0 bg-linear-to-t from-forest/85 via-forest/10 to-transparent" />
        <span className="absolute inset-x-3 bottom-2.5 flex items-center justify-between gap-2 text-sm font-bold text-white">
          {camp.photos.length} photos
          <span className="rounded-full bg-sun px-3 py-1 text-xs text-forest transition group-hover:translate-x-0.5">
            Open →
          </span>
        </span>
      </button>
    </div>
  );
}

/** A knot in the group's colours, sitting on the rope. */
function Knot() {
  return (
    <svg viewBox="0 0 40 40" className="size-9 drop-shadow-sm sm:size-11">
      <defs>
        <radialGradient id="knot-shade" cx="38%" cy="32%" r="70%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="15" fill="#f1e3c0" />
      <g fill="none" strokeWidth="5" strokeLinecap="round">
        <path d="M7 15c8-5 18-5 26 2" stroke="#912e37" />
        <path d="M6 23c9 4 19 4 28-3" stroke="#1e4428" />
        <path d="M13 7c-3 9-2 18 4 27" stroke="#ffdd32" />
        <path d="M27 7c3 9 2 18-4 27" stroke="#912e37" />
        <path d="M9 30c7-3 15-9 20-22" stroke="#f1e3c0" strokeWidth="3" />
      </g>
      <circle cx="20" cy="20" r="16" fill="url(#knot-shade)" />
    </svg>
  );
}

/** The photos of one camp, in a full-screen viewer with a thumbnail strip. */
function CampViewer({
  camp,
  onClose,
}: {
  camp: Extract<RopeEntry, { kind: "camp" }> | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  // Which photo is showing, remembered per camp: opening a different camp
  // starts at its first photo without an effect having to reset anything.
  const [at, setAt] = useState<{ slug: string; i: number }>({ slug: "", i: 0 });
  const current = camp && at.slug === camp.slug ? at.i : 0;
  const setCurrent = (next: number | ((i: number) => number)) =>
    setAt({
      slug: camp?.slug ?? "",
      i: typeof next === "function" ? next(current) : next,
    });

  useEffect(() => {
    const d = dialog.current;
    return d ? lightDismissFallback(d) : undefined;
  }, []);

  useEffect(() => {
    if (camp && !dialog.current?.open) dialog.current?.showModal();
  }, [camp]);

  // Keep the current thumbnail in view without scrolling the page.
  useEffect(() => {
    const el = strip.current;
    const thumb = el?.children[current] as HTMLElement | undefined;
    if (!el || !thumb) return;
    el.scrollTo({ left: thumb.offsetLeft - el.clientWidth / 2 + thumb.offsetWidth / 2, behavior: "smooth" });
  }, [current]);

  const photos = camp?.photos ?? [];
  const n = photos.length;
  const step = (by: number) => setCurrent((i) => (i + by + n) % n);
  const name = camp ? `${camp.season} Camp ${camp.year} — ${camp.place}` : "";
  const photo = photos[current];

  return (
    <dialog
      ref={dialog}
      {...LIGHT_DISMISS}
      onClose={onClose}
      aria-label={name}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") step(1);
        if (e.key === "ArrowLeft") step(-1);
      }}
      className="lightbox on-dark m-auto h-[min(94dvh,960px)] max-h-none w-[min(96vw,1200px)] max-w-none bg-transparent p-0 text-white"
    >
      {camp && photo ? (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 px-1 pb-3">
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold">{name}</p>
              <p className="text-sm text-white/75">
                {current + 1} / {n}
                <span className="mx-2" aria-hidden>·</span>
                <Link href={`/gallery/${camp.slug}`} className="font-semibold text-sun underline underline-offset-2">
                  Open album page
                </Link>
              </p>
            </div>
            <form method="dialog">
              <button
                aria-label="Close photos"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-2xl leading-none transition hover:bg-white/20"
              >
                ×
              </button>
            </form>
          </div>

          <div className="relative min-h-0 flex-1">
            <Photo
              key={photo.publicId}
              source={{ kind: "cloudinary", ...photo }}
              alt={`Photo ${current + 1} of ${n} from ${name}`}
              sizes="96vw"
              className="object-contain"
            />
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous photo"
              className="absolute left-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-2xl transition hover:bg-black/65 sm:left-3"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next photo"
              className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-2xl transition hover:bg-black/65 sm:right-3"
            >
              ›
            </button>
          </div>

          <div ref={strip} className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
            {photos.map((p, i) => (
              <button
                key={p.publicId}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Show photo ${i + 1} of ${n}`}
                aria-current={i === current ? "true" : undefined}
                className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-md transition sm:h-16 sm:w-24 ${
                  i === current ? "ring-2 ring-sun" : "opacity-60 hover:opacity-100"
                }`}
              >
                <Photo source={{ kind: "cloudinary", ...p }} alt="" sizes="96px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
