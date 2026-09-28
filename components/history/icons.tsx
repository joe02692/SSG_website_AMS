import type { MilestoneIcon } from "@/lib/site-content";

/** Small solid icons for the year pills on the rope. Decorative. */
export type PillIcon = MilestoneIcon | "sun" | "snow";

export function PillIcon({ name }: { name: PillIcon }) {
  const props = {
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    className: "size-5 shrink-0",
  } as const;
  switch (name) {
    case "sprout":
      return (
        <svg {...props} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21v-9" />
          <path d="M12 12c0-4 2.5-6.5 7-6.5 0 4.5-2.5 6.5-7 6.5Z" fill="currentColor" />
          <path d="M12 14.5C12 11 10 9 5.5 9c0 3.8 2 5.5 6.5 5.5Z" fill="currentColor" />
        </svg>
      );
    case "house":
      return (
        <svg {...props} fill="currentColor">
          <path d="M12 3 2.5 11h2.8v9.5h5.2v-6h3v6h5.2V11h2.8Z" />
        </svg>
      );
    case "people":
      return (
        <svg {...props} fill="currentColor">
          <circle cx="12" cy="7" r="3.2" />
          <circle cx="5.2" cy="9" r="2.4" />
          <circle cx="18.8" cy="9" r="2.4" />
          <path d="M6.5 19.5c0-3.4 2.5-6 5.5-6s5.5 2.6 5.5 6Z" />
          <path d="M1 19.5c0-2.8 1.8-4.8 4.2-4.8 1 0 1.8.3 2.5.8a7.5 7.5 0 0 0-2.2 4Z" />
          <path d="M23 19.5c0-2.8-1.8-4.8-4.2-4.8-1 0-1.8.3-2.5.8a7.5 7.5 0 0 1 2.2 4Z" />
        </svg>
      );
    case "laptop":
      return (
        <svg {...props} fill="currentColor">
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5V15H4Zm2 .5v7h12V6Z" />
          <path d="M1.5 16.5h21l-1.2 2.3a1.5 1.5 0 0 1-1.3.7H4a1.5 1.5 0 0 1-1.3-.7Z" />
        </svg>
      );
    case "sun":
      return (
        <svg {...props} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4.2" fill="currentColor" />
          <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
        </svg>
      );
    case "snow":
      return (
        <svg {...props} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7" />
          <path d="m9 3.5 3 2.5 3-2.5M9 20.5l3-2.5 3 2.5M3.2 10.6 7 11.9 6.3 8M20.8 13.4 17 12.1l.7 3.9M3.2 13.4 7 12.1 6.3 16M20.8 10.6 17 11.9l.7-3.9" />
        </svg>
      );
  }
}
