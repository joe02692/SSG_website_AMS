"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Photo } from "@/lib/site-content";

const INTERVAL_MS = 3000;
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
 * The homepage's sliding photo strip, as in the design: a new photo every
 * three seconds, sliding left.
 *
 * Two things the design's script didn't do, both required rather than nice:
 *
 *   • A pause button. Content that moves on its own for more than five
 *     seconds needs a way to stop it (WCAG 2.2.2) — for anyone who finds the
 *     motion distracting, and for anyone zoomed in who can't see a whole photo
 *     before it moves away.
 *   • It never starts for people whose device asks for reduced motion.
 *
 * It also stops while the tab is hidden, so a phone with the site open in a
 * background tab isn't decoding a 2000px photo every three seconds for nobody.
 */
export function HeroSlider({ slides }: { slides: Photo[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );

  useEffect(() => {
    if (paused || reduced || slides.length < 2) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setIndex((current) => (current + 1) % slides.length);
      }
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [paused, reduced, slides.length]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="flex h-full transition-transform duration-1000 ease-in-out motion-reduce:transition-none"
        style={{
          width: `${slides.length * 100}%`,
          transform: `translateX(-${(index * 100) / slides.length}%)`,
        }}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.src.src}
            className="relative h-full shrink-0"
            style={{ width: `${100 / slides.length}%` }}
            // Off-screen slides are hidden from screen readers so the page
            // doesn't announce three photos where a sighted visitor sees one.
            aria-hidden={i !== index}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              priority={i === 0}
              sizes="100vw"
              placeholder="blur"
              className="object-cover object-[center_35%]"
            />
          </div>
        ))}
      </div>

      {slides.length > 1 && !reduced ? (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Play slideshow" : "Pause slideshow"}
          className="on-dark absolute bottom-3 right-3 z-20 grid size-9 place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55"
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
  );
}
