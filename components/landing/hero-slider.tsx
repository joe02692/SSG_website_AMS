"use client";

import Image from "next/image";
import {
  useEffect,
  useReducer,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { HeroSlide } from "@/lib/site-content";
import { useT } from "@/lib/i18n/client";

const INTERVAL_MS = 6000;
const REDUCED = "(prefers-reduced-motion: reduce)";

/**
 * Which slide is showing, plus every slide that has been shown or is up next.
 *
 * Only those are mounted. Stacked full-screen <img>s are all "in the
 * viewport", so the browser's lazy loading doesn't help: with twelve photos
 * it would fetch all twelve (~4 MB) before a visitor has seen the second.
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
 * The homepage hero: crossfading photos with a bar of captions along the
 * bottom, in the style of nvidia.com — each item has a thin line that fills
 * in yellow while its photo is showing, then the next one takes over.
 *
 * - No pause button (the group's choice). The line holds while the pointer
 *   or keyboard focus is on the bar, so anyone reading a caption or picking
 *   a photo isn't rushed, and it never plays for people whose device asks
 *   for reduced motion.
 * - The CSS animation on the line drives the timing (its animationend moves
 *   on), so the line and the photo change can't drift apart, and a hidden
 *   tab stops by itself because browsers don't run animations there.
 * - `children` is the headline and buttons, laid out above the bar.
 */
export function HeroSlider({
  slides,
  children,
}: {
  slides: HeroSlide[];
  children?: ReactNode;
}) {
  const [{ index, seen }, go] = useReducer(show, {
    index: 0,
    seen: slides.length > 1 ? [0, 1] : [0],
  });
  const goTo = (to: number) => go({ to, count: slides.length });
  const t = useT();
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );

  // Keep the active item in view when the bar is wider than the screen.
  // Scrolls only the bar itself — scrollIntoView would also jump the page.
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bar.current;
    const item = el?.children[index] as HTMLElement | undefined;
    if (!el || !item) return;
    // Measured on screen rather than with offsetLeft/scrollLeft, which
    // count from the opposite side (and go negative) in right-to-left pages.
    const box = el.getBoundingClientRect();
    const r = item.getBoundingClientRect();
    const rtl = getComputedStyle(el).direction === "rtl";
    if (r.left < box.left || r.right > box.right) {
      const delta = rtl ? r.right - box.right + 16 : r.left - box.left - 16;
      el.scrollBy({ left: delta, behavior: reduced ? "auto" : "smooth" });
    }
  }, [index, reduced]);

  return (
    <>
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
                quality={90}
                placeholder="blur"
                style={{ objectPosition: slide.focus ?? "50% 35%" }}
                className={`object-cover ${i === index ? "ken-burns" : ""}`}
              />
            ) : null}
          </div>
        ))}
      </div>

      {/* Darkens the bottom for the headline and the bar. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/80 via-black/25 via-50% to-black/10"
      />

      <div className="relative flex flex-1 flex-col items-center justify-end px-4 pb-6 text-center sm:pb-8">
        {children}
      </div>

      {slides.length > 1 ? (
        <div className="on-dark hero-bar relative">
          <div
            ref={bar}
            role="group"
            aria-label={t.home.choosePhoto}
            className="no-scrollbar mx-auto flex w-full max-w-[1200px] items-start snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-3 [mask-image:linear-gradient(to_right,transparent,#000_16px,#000_calc(100%-56px),transparent)] rtl:[mask-image:linear-gradient(to_left,transparent,#000_16px,#000_calc(100%-56px),transparent)] sm:gap-6 sm:px-8 sm:pb-4"
          >
            {slides.map((slide, i) => {
              const active = i === index;
              return (
                <button
                  key={slide.src.src}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={active ? "true" : undefined}
                  aria-label={t.home.slideLabel(slide.label, slide.title, i + 1, slides.length)}
                  className="group w-[44%] shrink-0 snap-start py-3 text-start sm:w-[29%] lg:w-[calc((100%-5*1.5rem)/6)]"
                >
                  <span aria-hidden className="relative block h-[3px] overflow-hidden rounded-full bg-white/30 transition-colors group-hover:bg-white/55">
                    {active ? (
                      <span
                        key={index}
                        className="hero-progress absolute inset-0 bg-sun"
                        style={{ "--hero-interval": `${INTERVAL_MS}ms` } as CSSProperties}
                        onAnimationEnd={() => goTo(index + 1)}
                      />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );
}
