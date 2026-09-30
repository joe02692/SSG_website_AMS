"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Photo } from "@/components/gallery/photo";
import { PillIcon } from "@/components/history/icons";
import { LIGHT_DISMISS, lightDismissFallback } from "@/components/ui/dialog-utils";
import type { MilestoneIcon } from "@/lib/site-content";
import type { LocalizedCamp } from "@/lib/i18n/content";
import { useT } from "@/lib/i18n/client";

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
  | ({ kind: "camp"; key: string; photos: CampPhoto[] } & LocalizedCamp);

/**
 * The History page's rope: the group's milestones and every camp, oldest at
 * the top, knotted onto a natural jute rope that sways from knot to knot.
 *
 * A camp with photos is a button that opens them in a viewer right here;
 * one without says so. The rope and knots are decoration — the entries are
 * a real ordered list, so a screen reader hears them in date order whichever
 * side each sits on.
 *
 * Phones: the rope runs down the start side (left in English, right in
 * Arabic), every entry beside it. From sm up entries alternate sides, each
 * tucked ~40px under the one before. All positions are logical (start/end),
 * so the whole rope mirrors itself in right-to-left pages.
 */
export function Timeline({ entries }: { entries: RopeEntry[] }) {
  const [open, setOpen] = useState<Extract<RopeEntry, { kind: "camp" }> | null>(null);
  return (
    <div className="relative mx-auto mt-10 max-w-[880px]">
      <Rope count={entries.length} />
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
                data-knot
                className="col-start-1 row-start-1 flex justify-center self-start pt-px sm:col-start-2 sm:-mt-[3px] sm:pt-0"
              >
                <Knot />
              </span>
              <div
                className={`relative col-start-2 row-start-1 min-w-0 ps-7 sm:max-w-[380px] ${
                  right
                    ? "sm:col-start-3 sm:ps-12"
                    : "sm:col-start-1 sm:w-full sm:justify-self-end sm:ps-0 sm:pe-1"
                }`}
              >
                {/* Knot-to-pill line: always on phones, and on the right-hand side. */}
                <Tie
                  className={`absolute -start-3 top-[19px] w-9 sm:w-14 ${right ? "" : "sm:hidden"}`}
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
      <span className="absolute -start-1 top-1/2 size-2 -translate-y-1/2 rounded-full bg-sun" />
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
          <span className="text-sm font-semibold">{entry.seasonName}</span>
        ) : null}
      </p>
      {side === "left" ? (
        <span aria-hidden className="relative -me-4 ms-3 hidden h-0.5 flex-1 bg-sun/80 sm:block">
          <span className="absolute -end-1 top-1/2 size-2 -translate-y-1/2 rounded-full bg-sun" />
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
  const t = useT().history;
  const heading = (
    <>
      <span className="block font-sans text-lg font-bold text-forest">
        {camp.title}
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
          {t.photosComingSoon}
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
        aria-label={t.seePhotos(camp.photos.length, camp.fullName)}
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
          {t.photoCount(camp.photos.length)}
          <span className="rounded-full bg-sun px-3 py-1 text-xs text-forest transition group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
            {t.open} <span aria-hidden className="inline-block rtl:-scale-x-100">→</span>
          </span>
        </span>
      </button>
    </div>
  );
}

/**
 * The rope: one SVG path through every knot, swinging out to alternate sides
 * between them like a real rope hanging loose, in jute colours.
 *
 * The knots' positions depend on how tall each entry turns out, so the path
 * is worked out in the browser from where the knots actually are, and again
 * whenever the layout changes size (a photo loading, the window resizing).
 */
function Rope({ count }: { count: number }) {
  const [shape, setShape] = useState<{ d: string; w: number; h: number; thick: number } | null>(null);
  // Measures the timeline it sits in. (A ref passed down from the parent
  // wouldn't be attached yet when this effect runs — children's layout
  // effects run before their parent's ref is set.)
  const svg = useRef<SVGSVGElement>(null);

  useLayoutEffect(() => {
    const el = svg.current?.parentElement;
    if (!el) return;

    const measure = () => {
      const knots = [...el.querySelectorAll<HTMLElement>("[data-knot]")];
      if (knots.length === 0) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      // Same switch as the layout: from sm (640px) the rope runs down the middle.
      const wide = window.matchMedia("(min-width: 640px)").matches;
      // On phones the rope hugs the start edge: left in English, right in Arabic.
      const rtl = getComputedStyle(el).direction === "rtl";
      const x = wide ? w / 2 : rtl ? w - 20 : 20;
      const swing = wide ? 30 : 9;

      // Centre of each knot, relative to the timeline. offsetTop ignores the
      // entries' reveal animation, so the rope doesn't chase them around.
      const ys = knots.map((k) => {
        let y = k.offsetHeight / 2;
        let node: HTMLElement | null = k;
        while (node && node !== el) {
          y += node.offsetTop;
          node = node.offsetParent as HTMLElement | null;
        }
        return y;
      });

      const points = [ys[0] - 26, ...ys, h - 4];
      let d = `M${x} ${points[0]}`;
      for (let i = 1; i < points.length; i++) {
        const y0 = points[i - 1];
        const y1 = points[i];
        const gap = y1 - y0;
        // Swing further on long stretches, barely at all on short ones.
        const bend = Math.min(swing, gap / 5) * (i % 2 === 0 ? 1 : -1);
        d += ` C${x + bend} ${y0 + gap / 3} ${x + bend} ${y1 - gap / 3} ${x} ${y1}`;
      }
      setShape({ d, w, h, thick: wide ? 15 : 11 });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [count]);

  const { d, w, h, thick } = shape ?? { d: "", w: 0, h: 0, thick: 0 };
  return (
    <svg
      ref={svg}
      aria-hidden
      width={w}
      height={h}
      className="pointer-events-none absolute inset-0 overflow-visible"
    >
      {/* Soft shadow, dark edge, jute body, then the twist: short dark bands
          across the rope, and a thin highlight along it. */}
      <path d={d} fill="none" stroke="rgb(60 40 15 / 0.18)" strokeWidth={thick + 6} strokeLinecap="round" transform="translate(2 3)" />
      <path d={d} fill="none" stroke="#8a6534" strokeWidth={thick + 3} strokeLinecap="round" />
      <path d={d} fill="none" stroke="#c9a36a" strokeWidth={thick} strokeLinecap="round" />
      <path d={d} fill="none" stroke="#a37b45" strokeWidth={thick} strokeDasharray="3 6" />
      <path d={d} fill="none" stroke="#e6cf9f" strokeWidth={thick / 4} strokeDasharray="5 4" opacity="0.7" />
    </svg>
  );
}

/** A jute knot sitting on the rope. */
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
      <circle cx="20" cy="20" r="15.5" fill="#8a6534" />
      <circle cx="20" cy="20" r="14" fill="#c9a36a" />
      <g fill="none" strokeWidth="4.5" strokeLinecap="round">
        <path d="M7 15c8-5 18-5 26 2" stroke="#a37b45" />
        <path d="M6 23c9 4 19 4 28-3" stroke="#b58c52" />
        <path d="M13 7c-3 9-2 18 4 27" stroke="#d9bb85" />
        <path d="M27 7c3 9 2 18-4 27" stroke="#a37b45" />
        <path d="M9 30c7-3 15-9 20-22" stroke="#e6cf9f" strokeWidth="2.5" />
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

  const t = useT().history;

  // Keep the current thumbnail in view without scrolling the page. Measured
  // on screen, so it works the same in left-to-right and right-to-left.
  useEffect(() => {
    const el = strip.current;
    const thumb = el?.children[current] as HTMLElement | undefined;
    if (!el || !thumb) return;
    const box = el.getBoundingClientRect();
    const r = thumb.getBoundingClientRect();
    el.scrollBy({ left: r.left + r.width / 2 - (box.left + box.width / 2), behavior: "smooth" });
  }, [current]);

  const photos = camp?.photos ?? [];
  const n = photos.length;
  const step = (by: number) => setCurrent((i) => (i + by + n) % n);
  const name = camp ? camp.fullName : "";
  const photo = photos[current];

  return (
    <dialog
      ref={dialog}
      {...LIGHT_DISMISS}
      onClose={onClose}
      aria-label={name}
      onKeyDown={(e) => {
        // "Forward" is the reading direction: → in English, ← in Arabic.
        const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
        if (e.key === "ArrowRight") step(rtl ? -1 : 1);
        if (e.key === "ArrowLeft") step(rtl ? 1 : -1);
      }}
      className="lightbox on-dark m-auto h-[min(94dvh,960px)] max-h-none w-[min(96vw,1200px)] max-w-none bg-transparent p-0 text-white"
    >
      {camp && photo ? (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 px-1 pb-3">
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold">{name}</p>
              <p className="text-sm text-white/75">
                {t.counter(current + 1, n)}
                <span className="mx-2" aria-hidden>·</span>
                <Link href={`/gallery/${camp.slug}`} className="font-semibold text-sun underline underline-offset-2">
                  {t.openAlbum}
                </Link>
              </p>
            </div>
            <form method="dialog">
              <button
                aria-label={t.closePhotos}
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
              alt={t.photoAlt(current + 1, n, name)}
              sizes="96vw"
              className="object-contain"
            />
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label={t.previousPhoto}
              className="absolute start-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-2xl transition hover:bg-black/65 sm:start-3"
            >
              <span aria-hidden className="rtl:-scale-x-100">‹</span>
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label={t.nextPhoto}
              className="absolute end-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-2xl transition hover:bg-black/65 sm:end-3"
            >
              <span aria-hidden className="rtl:-scale-x-100">›</span>
            </button>
          </div>

          <div ref={strip} className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
            {photos.map((p, i) => (
              <button
                key={p.publicId}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={t.showPhoto(i + 1, n)}
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
