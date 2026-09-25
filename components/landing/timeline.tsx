import Image from "next/image";
import { MILESTONES } from "@/lib/site-content";
import rope from "@/public/images/rope.jpg";

/**
 * The rope timeline.
 *
 * The rope is decoration: the milestones are a real ordered list, so a screen
 * reader hears them in date order regardless of which side each sits on.
 * Phones: rope down the left edge, every milestone to its right — the zigzag
 * leaves each column ~130px wide on a phone. From sm up, the design's
 * alternating layout, each milestone overlapping the previous by ~60px.
 */
export function Timeline() {
  return (
    <div className="relative mx-auto mt-8 max-w-[832px]">
      <Image
        src={rope}
        alt=""
        className="pointer-events-none absolute left-0 top-0 z-0 h-full w-10 object-fill mix-blend-multiply sm:left-1/2 sm:w-16 sm:-translate-x-1/2 md:w-20"
      />
      <ol className="relative grid grid-cols-[40px_1fr] gap-x-3 gap-y-6 sm:grid-cols-[1fr_64px_1fr] sm:gap-x-2 sm:gap-y-0 md:grid-cols-[1fr_80px_1fr] md:gap-x-3">
        {MILESTONES.map((m, i) => {
          const right = i % 2 === 0;
          return (
            <li
              key={m.year}
              style={{ gridRow: i + 1 }}
              className={`reveal relative z-10 col-start-2 flex flex-col items-start justify-center text-left sm:min-h-[128px] ${
                i > 0 ? "sm:-mt-14" : ""
              } ${right ? "sm:col-start-3 sm:pl-1.5" : "sm:col-start-1 sm:items-end sm:pr-1.5 sm:text-right"}`}
            >
              <p className="rounded-full border-2 border-maroon px-2.5 py-0.5 font-display text-base font-semibold text-maroon">
                {m.year}
              </p>
              <h3 className="mt-1.5 font-sans text-base font-bold text-[#141414]">
                {m.title}
              </h3>
              <p className="mt-1 text-sm leading-normal text-[#141414]/80">
                {m.body}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
