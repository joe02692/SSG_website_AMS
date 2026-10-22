"use client";

import { useEffect, useState } from "react";

/**
 * Default target date for the upcoming camp countdown.
 * Can be overridden by passing the `targetDate` prop to `<EventComingSoon />`.
 */
export const DEFAULT_EVENT_TARGET_DATE = "2026-10-31T04:00:00+03:00";

export interface EventComingSoonProps {
  /** Target date/time for the countdown (ISO string or Date instance). */
  targetDate?: string | Date;
}

interface CountdownTime {
  days: string;
  hours: string;
  mins: string;
}

function calculateTimeLeft(target: string | Date): CountdownTime {
  const targetMs =
    typeof target === "string" ? new Date(target).getTime() : target.getTime();
  const diff = Math.max(0, targetMs - Date.now());

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;

  return {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
    mins: String(mins).padStart(2, "0"),
  };
}

/**
 * Floating "Event Coming Soon" countdown widget pinned to the top-right corner.
 *
 * - State 1 (Default): Expanded pill card with live DAYS / HOURS / MINS countdown.
 * - State 2 (Collapsed): 68×68 circular floating badge after clicking the X button;
 *   clicking anywhere on the circle smoothly re-expands the popup.
 */
export function EventComingSoon({
  targetDate = DEFAULT_EVENT_TARGET_DATE,
}: EventComingSoonProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [timeLeft, setTimeLeft] = useState<CountdownTime>(() =>
    calculateTimeLeft(targetDate),
  );

  useEffect(() => {
    const syncTimeout = window.setTimeout(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 0);

    // Align the first tick to the next minute boundary, then tick every 60s.
    const msUntilNextMinute = 60_000 - (Date.now() % 60_000);
    let intervalId: number | undefined;

    const boundaryTimeout = window.setTimeout(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
      intervalId = window.setInterval(() => {
        setTimeLeft(calculateTimeLeft(targetDate));
      }, 60_000);
    }, msUntilNextMinute);

    return () => {
      window.clearTimeout(syncTimeout);
      window.clearTimeout(boundaryTimeout);
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [targetDate]);

  return (
    <aside
      dir="ltr"
      aria-label="Upcoming event countdown"
      style={{
        position: "fixed",
        top: "80px",
        right: "24px",
        zIndex: 9999,
        backgroundColor: "#234d2c",
        border: "2px solid #e5c130",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.25)",
        borderRadius: isCollapsed ? "50%" : "36px",
        width: isCollapsed ? "68px" : "min(324px, calc(100vw - 32px))",
        height: isCollapsed ? "68px" : "202px",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      className={`on-dark overflow-hidden select-none ${
        isCollapsed ? "cursor-pointer hover:scale-[1.06] active:scale-[0.98]" : ""
      }`}
    >
      {/* State 1: Expanded Popup */}
      <div
        aria-hidden={isCollapsed}
        style={{
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          transformOrigin: "top right",
        }}
        className={`relative flex h-[198px] w-[min(320px,calc(100vw-36px))] flex-col items-center justify-center px-5 pt-4 pb-3.5 text-center ${
          isCollapsed
            ? "pointer-events-none scale-75 opacity-0"
            : "pointer-events-auto scale-100 opacity-100"
        }`}
      >
        {/* Close Button (X) */}
        <button
          type="button"
          aria-label="Collapse event popup"
          onClick={() => setIsCollapsed(true)}
          style={{ color: "#fdfbf2" }}
          className="absolute top-3 right-4 grid size-7 place-items-center rounded-full text-sm leading-none opacity-80 transition hover:bg-white/10 hover:opacity-100"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
          </svg>
        </button>

        {/* Header */}
        <p className="flex items-center justify-center gap-1.5 pr-3 text-[15px] font-extrabold tracking-wide uppercase sm:text-base">
          <span aria-hidden="true" className="text-base leading-none sm:text-lg">
            🔥
          </span>
          <span style={{ color: "#e5c130" }}>EVENT</span>
          <span style={{ color: "#fdfbf2" }}>COMING SOON!</span>
        </p>

        {/* Subtext */}
        <p
          style={{ color: "#fdfbf2" }}
          className="mt-1 max-w-[235px] text-center text-xs leading-snug opacity-95 sm:text-[13px]"
        >
          Our biggest camp of the year is almost here.
        </p>

        {/* Countdown Timer (DAYS : HOURS : MINS) */}
        <div
          role="timer"
          aria-live="off"
          className="mt-3 flex items-start justify-center gap-2 sm:gap-2.5"
        >
          {/* DAYS */}
          <div className="flex flex-col items-center">
            <div
              style={{
                background: "#e5c130",
                color: "#1a3a20",
                borderRadius: "14px",
                fontWeight: "bold",
              }}
              className="flex h-12 w-12 items-center justify-center text-xl leading-none font-extrabold tabular-nums shadow-sm sm:h-[52px] sm:w-[52px] sm:text-2xl"
            >
              <span suppressHydrationWarning>{timeLeft.days}</span>
            </div>
            <span
              style={{ color: "#fdfbf2" }}
              className="mt-1.5 text-[10px] font-semibold tracking-wider uppercase sm:text-[11px]"
            >
              DAYS
            </span>
          </div>

          <span
            aria-hidden="true"
            style={{ color: "#e5c130" }}
            className="flex h-12 items-center justify-center text-xl font-extrabold sm:h-[52px] sm:text-2xl"
          >
            :
          </span>

          {/* HOURS */}
          <div className="flex flex-col items-center">
            <div
              style={{
                background: "#e5c130",
                color: "#1a3a20",
                borderRadius: "14px",
                fontWeight: "bold",
              }}
              className="flex h-12 w-12 items-center justify-center text-xl leading-none font-extrabold tabular-nums shadow-sm sm:h-[52px] sm:w-[52px] sm:text-2xl"
            >
              <span suppressHydrationWarning>{timeLeft.hours}</span>
            </div>
            <span
              style={{ color: "#fdfbf2" }}
              className="mt-1.5 text-[10px] font-semibold tracking-wider uppercase sm:text-[11px]"
            >
              HOURS
            </span>
          </div>

          <span
            aria-hidden="true"
            style={{ color: "#e5c130" }}
            className="flex h-12 items-center justify-center text-xl font-extrabold sm:h-[52px] sm:text-2xl"
          >
            :
          </span>

          {/* MINS */}
          <div className="flex flex-col items-center">
            <div
              style={{
                background: "#e5c130",
                color: "#1a3a20",
                borderRadius: "14px",
                fontWeight: "bold",
              }}
              className="flex h-12 w-12 items-center justify-center text-xl leading-none font-extrabold tabular-nums shadow-sm sm:h-[52px] sm:w-[52px] sm:text-2xl"
            >
              <span suppressHydrationWarning>{timeLeft.mins}</span>
            </div>
            <span
              style={{ color: "#fdfbf2" }}
              className="mt-1.5 text-[10px] font-semibold tracking-wider uppercase sm:text-[11px]"
            >
              MINS
            </span>
          </div>
        </div>
      </div>

      {/* State 2: Collapsed Floating Circle */}
      <button
        type="button"
        aria-label="Expand event countdown details"
        aria-hidden={!isCollapsed}
        tabIndex={isCollapsed ? 0 : -1}
        onClick={() => setIsCollapsed(false)}
        style={{
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        className={`absolute inset-0 flex flex-col items-center justify-center gap-0.5 rounded-full ${
          isCollapsed
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-50 opacity-0"
        }`}
      >
        <span aria-hidden="true" className="text-lg leading-none">
          🔥
        </span>
        <span
          style={{ color: "#fdfbf2" }}
          className="text-[11px] leading-none font-extrabold tracking-wide uppercase"
        >
          EVENT
        </span>
      </button>
    </aside>
  );
}
