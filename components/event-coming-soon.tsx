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
  soon: string;
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
 * Floating "event coming soon" countdown, pinned under the header
 * ("Editorial split card" design, Nov 2026).
 *
 * - Expanded: a header row (a "Soon" chip, the title, ×), the description if
 *   there is one, and one segmented DAYS | HOURS | MINS strip.
 * - Collapsed: a small pill (flame + "Event") after pressing ×; pressing it
 *   opens the card again. The choice is remembered in this browser for this
 *   event.
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
    { value: timeLeft.days, label: labels.days, accent: false },
    { value: timeLeft.hours, label: labels.hours, accent: false },
    { value: timeLeft.mins, label: labels.mins, accent: true },
  ];

  // z-40: above the page, below the header (z-50) so the mobile menu always
  // covers it. `end-*` puts it on the left in Arabic and the right in English.
  const shell =
    "on-dark toast-in fixed end-3 top-[84px] z-40 border border-brand-400/25 bg-brand-950/95 text-white shadow-[0_16px_40px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl select-none sm:end-6";

  if (isCollapsed) {
    return (
      <aside aria-label={labels.region} key="collapsed" className={`${shell} rounded-full`}>
        <button
          type="button"
          aria-label={labels.expand}
          onClick={() => setCollapsed(false)}
          className="flex h-10 items-center gap-1.5 rounded-full ps-3 pe-3.5 text-xs font-bold transition hover:bg-white/5"
        >
          <FlameIcon className="size-4 text-sun" />
          <span>{labels.badge}</span>
          <span dir="ltr" className="font-bold text-sun tabular-nums">
            {timeLeft.days}
            <span className="ms-0.5 text-[10px] font-medium text-accent-300/80">{labels.days}</span>
          </span>
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label={labels.region}
      key="expanded"
      className={`${shell} w-[min(300px,calc(100vw-24px))] rounded-2xl p-3`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex shrink-0 items-center rounded-lg border border-sun/30 bg-sun/15 px-2 py-0.5 text-[10px] font-bold text-sun">
            {labels.soon}
          </span>
          <p className="min-w-0 text-[13px] leading-snug font-bold">{title}</p>
        </div>
        <button
          type="button"
          aria-label={labels.collapse}
          onClick={() => setCollapsed(true)}
          className="-me-0.5 grid size-7 shrink-0 place-items-center rounded-md text-white/55 transition hover:bg-white/10 hover:text-white"
        >
          <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
          </svg>
        </button>
      </div>

      {description ? (
        <p className="mt-2 text-xs leading-snug text-white/75">{description}</p>
      ) : null}

      {/* Always left-to-right: days | hours | minutes reads the same in Arabic. */}
      <div
        role="timer"
        aria-live="off"
        dir="ltr"
        className="mt-2.5 flex items-center divide-x divide-white/10 rounded-xl border border-white/5 bg-black/30 py-2"
      >
        {units.map((unit) => (
          <div key={unit.label} className="flex flex-1 items-baseline justify-center gap-1 px-1">
            <span className={`text-base font-bold tabular-nums ${unit.accent ? "text-sun" : "text-white"}`}>
              {unit.value}
            </span>
            <span className={`text-[10px] font-medium ${unit.accent ? "text-accent-300/80" : "text-brand-300/80"}`}>
              {unit.label}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
