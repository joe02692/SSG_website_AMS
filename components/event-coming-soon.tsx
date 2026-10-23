"use client";

import { useEffect, useState } from "react";

export type EventCountdownLabels = {
  region: string;
  days: string;
  hours: string;
  mins: string;
  collapse: string;
  expand: string;
  badge: string;
};

export interface EventComingSoonProps {
  title: string;
  description: string;
  /** When the event starts (ISO). The card hides itself at that moment. */
  startsAt: string;
  labels: EventCountdownLabels;
}

interface CountdownTime {
  days: string;
  hours: string;
  mins: string;
  done: boolean;
}

function calculateTimeLeft(targetMs: number): CountdownTime {
  const diff = Math.max(0, targetMs - Date.now());
  const totalMinutes = Math.ceil(diff / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;
  return {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
    mins: String(mins).padStart(2, "0"),
    done: diff <= 0,
  };
}

/** Remembered per event, so closing it once keeps it small on every page. */
function storageKey(startsAt: string, title: string) {
  return `event-collapsed:${startsAt}:${title}`;
}

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2c.4 3-1.2 4.8-2.7 6.5C7.8 10.2 6.5 11.7 6.5 14a5.5 5.5 0 0 0 11 0c0-2-1-3.6-2.1-4.7.1 1.5-.5 2.6-1.6 3 .5-3.4-.7-7.1-1.8-10.3Z" />
    </svg>
  );
}

/**
 * Floating "event coming soon" countdown, pinned under the header.
 *
 * - Expanded: title, description and a live DAYS / HOURS / MINS countdown.
 * - Collapsed: a 68px round badge after pressing ×; pressing the badge opens
 *   it again. The choice is remembered in this browser for this event.
 *
 * What it says and when it counts down to are set by the head site admin on
 * /admin (table site_event, migration 0023). It hides itself once the event
 * starts, and draws nothing until it has mounted, so the server's clock and
 * the visitor's never disagree on screen.
 */
export function EventComingSoon({ title, description, startsAt, labels }: EventComingSoonProps) {
  const targetMs = new Date(startsAt).getTime();
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [timeLeft, setTimeLeft] = useState<CountdownTime>(() => calculateTimeLeft(targetMs));

  useEffect(() => {
    // Mounting is the moment we can read the visitor's clock and storage.
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      setIsCollapsed(window.localStorage.getItem(storageKey(startsAt, title)) === "1");
    } catch {
      // Private mode or blocked storage: just start expanded.
    }
    setTimeLeft(calculateTimeLeft(targetMs));
    setMounted(true);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Tick on each minute boundary, then every 60 s.
    let intervalId: number | undefined;
    const boundary = window.setTimeout(() => {
      setTimeLeft(calculateTimeLeft(targetMs));
      intervalId = window.setInterval(() => setTimeLeft(calculateTimeLeft(targetMs)), 60_000);
    }, 60_000 - (Date.now() % 60_000));

    return () => {
      window.clearTimeout(boundary);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [targetMs, startsAt, title]);

  function setCollapsed(next: boolean) {
    setIsCollapsed(next);
    try {
      const key = storageKey(startsAt, title);
      if (next) window.localStorage.setItem(key, "1");
      else window.localStorage.removeItem(key);
    } catch {
      // Not remembered — fine.
    }
  }

  if (!mounted || timeLeft.done || Number.isNaN(targetMs)) return null;

  const units = [
    { value: timeLeft.days, label: labels.days },
    { value: timeLeft.hours, label: labels.hours },
    { value: timeLeft.mins, label: labels.mins },
  ];

  return (
    <aside
      aria-label={labels.region}
      style={{ transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}
      // z-40: above the page, below the header (z-50) so the mobile menu
      // always covers it.
      className={`on-dark fixed end-3 top-[84px] z-40 overflow-hidden border-2 border-sun bg-forest text-cream shadow-[0_10px_25px_rgba(0,0,0,0.25)] select-none sm:end-6 ${
        isCollapsed
          ? "size-[68px] cursor-pointer rounded-full hover:scale-[1.06] active:scale-[0.98]"
          : "w-[min(324px,calc(100vw-24px))] rounded-[28px] sm:rounded-[36px]"
      }`}
    >
      {isCollapsed ? (
        <button
          type="button"
          aria-label={labels.expand}
          onClick={() => setCollapsed(false)}
          className="flex size-full flex-col items-center justify-center gap-0.5 rounded-full"
        >
          <FlameIcon className="size-5 text-sun" />
          <span className="text-[11px] leading-none font-extrabold">{labels.badge}</span>
        </button>
      ) : (
        <div className="relative flex flex-col items-center px-5 pt-4 pb-3.5 text-center">
          <button
            type="button"
            aria-label={labels.collapse}
            onClick={() => setCollapsed(true)}
            className="absolute end-3 top-3 grid size-8 place-items-center rounded-full opacity-80 transition hover:bg-white/10 hover:opacity-100"
          >
            <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
            </svg>
          </button>

          <p className="flex items-center justify-center gap-1.5 px-7 text-[15px] font-extrabold sm:text-base">
            <FlameIcon className="size-4 shrink-0 text-sun sm:size-5" />
            <span className="text-sun">{title}</span>
          </p>

          {description ? (
            <p className="mt-1 max-w-[260px] text-xs leading-snug opacity-95 sm:text-[13px]">
              {description}
            </p>
          ) : null}

          {/* Always left-to-right: days : hours : minutes reads the same in Arabic. */}
          <div role="timer" aria-live="off" dir="ltr" className="mt-3 flex items-start justify-center gap-2 sm:gap-2.5">
            {units.map((unit, i) => (
              <div key={unit.label} className="flex items-start gap-2 sm:gap-2.5">
                {i > 0 ? (
                  <span aria-hidden className="flex h-12 items-center text-xl font-extrabold text-sun sm:h-[52px] sm:text-2xl">
                    :
                  </span>
                ) : null}
                <div className="flex flex-col items-center">
                  <div className="flex size-12 items-center justify-center rounded-[14px] bg-sun text-xl leading-none font-extrabold text-forest tabular-nums shadow-sm sm:size-[52px] sm:text-2xl">
                    {unit.value}
                  </div>
                  <span className="mt-1.5 text-[11px] font-semibold">{unit.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
