"use client";

import Image from "next/image";
import { useEffect, useReducer, useState, useSyncExternalStore } from "react";
import type { Photo } from "@/lib/site-content";

const INTERVAL_MS = 5000;
const REDUCED = "(prefers-reduced-motion: reduce)";
/** Above this many photos, dots become ‹ 3 / 15 › — fifteen dots don't fit
 *  beside the pause button on a 320px phone. */
const MAX_DOTS = 6;

/**
 * Which slide is showing, plus every slide that has been shown or is up next.
 *
 * Only those are mounted. Stacked full-screen <img>s are all "in the
 * viewport", so the browser's lazy loading doesn't help: with fifteen photos
 * it would fetch all fifteen (~5 MB) before a visitor has seen the second.
 * Mounting the next one early means it's ready before the crossfade starts.
 */
type Show = { index: number; seen: number[] };
function show(state: Show, action: { to: number; count: number }): Show {
  const to = ((action.to % action.count) + action.count) % action.count;
  const next = (to + 1) % action.count;
  const seen = [...new Set([...state.seen, to, next])];
  return { index: to, seen };
}

// Read the OS "reduce motion" setting as an external store rather than
// mirroring it into state from an effect. On the server there is no setting
// to read, so it renders as "motion allowed" and corrects itself on hydration.
function subscribeReduced(onChange: () => void) {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * The homepage's photo strip.
 *
 * Crossfades rather than sliding (calmer behind text, and cheaper — only
 * opacity changes), with a slow zoom on the photo that is showing. Dots let
 * a visitor jump to any photo, and the pause button satisfies WCAG 2.2.2:
 * anything that moves on its own for more than five seconds needs a way to
 * stop it.
 *
 * It never auto-advances for people whose device asks for reduced motion, and
 * stops while the tab is hidden so a phone isn't decoding 2000px photos for
 * nobody.
 */
export function HeroSlider({ slides }: { slides: Photo[] }) {
  const [{ index, seen }, go] = useReducer(show, {
    index: 0,
    seen: slides.length > 1 ? [0, 1] : [0],
  });
  const goTo = (to: number) => go({ to, count: slides.length });
  const [paused, setPaused] = useState(false);
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
  const auto = !paused && !reduced && slides.length > 1;

  useEffect(() => {
    if (!auto) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        go({ to: index + 1, count: slides.length });
      }
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [auto, slides.length, index]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {slides.map((slide, i) => (
        <div
          key={slide.src.src}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
          // Only the showing photo is exposed to screen readers.
          aria-hidden={i !== index}
        >
          {seen.includes(i) ? (
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            priority={i === 0}
            sizes="100vw"
            placeholder="blur"
            className={`object-cover object-[center_35%] ${i === index ? "ken-burns" : ""}`}
          />
          ) : null}
        </div>
      ))}

      {slides.length > 1 ? (
        <div className="on-dark absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-full bg-black/35 px-2.5 py-1.5 backdrop-blur-sm sm:bottom-6 sm:right-6">
          {slides.length <= MAX_DOTS ? (
            slides.map((slide, i) => (
              <button
                key={slide.src.src}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show photo ${i + 1} of ${slides.length}`}
                aria-current={i === index ? "true" : undefined}
                className="grid size-6 place-items-center"
              >
                <span
                  aria-hidden
                  className={`block h-2 rounded-full transition-all duration-300 ${
                    i === index ? "w-6 bg-sun" : "w-2 bg-white/70"
                  }`}
                />
              </button>
            ))
          ) : (
            <>
              <button
                type="button"
                onClick={() => goTo(index - 1)}
                aria-label="Previous photo"
                className="grid size-7 place-items-center rounded-full text-lg leading-none text-white transition hover:bg-white/15"
              >
                ‹
              </button>
              <span className="min-w-[3.25rem] text-center text-xs font-semibold tabular-nums text-white">
                {index + 1} / {slides.length}
              </span>
              <button
                type="button"
                onClick={() => goTo(index + 1)}
                aria-label="Next photo"
                className="grid size-7 place-items-center rounded-full text-lg leading-none text-white transition hover:bg-white/15"
              >
                ›
              </button>
            </>
          )}
          {!reduced ? (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "Play slideshow" : "Pause slideshow"}
              className="ml-1 grid size-7 place-items-center rounded-full text-white transition hover:bg-white/15"
            >
              {paused ? (
                <svg aria-hidden viewBox="0 0 16 16" className="size-3.5 fill-current">
                  <path d="M4 2.5v11l9-5.5z" />
                </svg>
              ) : (
                <svg aria-hidden viewBox="0 0 16 16" className="size-3.5 fill-current">
                  <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" />
                </svg>
              )}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
