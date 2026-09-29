import type { GoalIcon as GoalIconName } from "@/lib/site-content";

/** Line icons for the "Our Goals" cards. Decorative: always aria-hidden. */
export function GoalIcon({ name }: { name: GoalIconName }) {
  const common = {
    viewBox: "0 0 32 32",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: "size-7",
  };
  switch (name) {
    case "citizen":
      return (
        <svg {...common}>
          <path d="M8 28V5" />
          <path d="M8 6h15l-3 5 3 5H8" />
        </svg>
      );
    case "talent":
      return (
        <svg {...common}>
          <path d="m16 4 3.6 7.4 8.1 1.2-5.9 5.7 1.4 8.1L16 22.6l-7.2 3.8 1.4-8.1-5.9-5.7 8.1-1.2z" />
        </svg>
      );
    case "globe":
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="12" />
          <path d="M4 16h24M16 4c3.5 3.5 5 7.5 5 12s-1.5 8.5-5 12c-3.5-3.5-5-7.5-5-12s1.5-8.5 5-12z" />
        </svg>
      );
    case "tent":
      return (
        <svg {...common}>
          <path d="M16 5 4 27h24z" />
          <path d="M16 5v22M12 27l4-8 4 8" />
        </svg>
      );
    case "friends":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="4" />
          <circle cx="22" cy="12" r="3.5" />
          <path d="M3.5 26c0-4.5 3.4-8 7.5-8s7.5 3.5 7.5 8M18.5 19.5c1-.9 2.2-1.5 3.5-1.5 3.6 0 6.5 3.2 6.5 7.5" />
        </svg>
      );
    case "service":
      return (
        <svg {...common}>
          <path d="M16 27s-10-5.8-10-13a5.5 5.5 0 0 1 10-3.2A5.5 5.5 0 0 1 26 14c0 7.2-10 13-10 13z" />
        </svg>
      );
  }
}
