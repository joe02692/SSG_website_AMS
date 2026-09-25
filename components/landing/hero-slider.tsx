"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Photo } from "@/lib/site-content";

const INTERVAL_MS = 5000;
const REDUCED = "(prefers-reduced-motion: reduce)";

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
  const [index, setIndex] = useState(0);
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
        setIndex((current) => (current + 1) % slides.length);
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
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            priority={i === 0}
            sizes="100vw"
            placeholder="blur"
            className={`object-cover object-[center_35%] ${i === index ? "ken-burns" : ""}`}
          />
        </div>
      ))}

      {slides.length > 1 ? (
        <div className="on-dark absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-full bg-black/35 px-2.5 py-1.5 backdrop-blur-sm sm:bottom-6 sm:right-6">
          {slides.map((slide, i) => (
            <button
              key={slide.src.src}
              type="button"
              onClick={() => setIndex(i)}
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
          ))}
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
