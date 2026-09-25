/** Small line icons for the values cards. Decorative: always aria-hidden. */
const common = {
  viewBox: "0 0 32 32",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className: "size-8",
};

export function ValueIcon({ name }: { name: "compass" | "hands" | "tent" }) {
  if (name === "compass") {
    return (
      <svg {...common}>
        <circle cx="16" cy="16" r="12" />
        <path d="m20.5 11.5-3 6-6 3 3-6z" />
        <path d="M16 4v2M16 26v2M4 16h2M26 16h2" />
      </svg>
    );
  }
  if (name === "hands") {
    return (
      <svg {...common}>
        <path d="M4 18l5-5c1.5-1.5 3.5-1.5 5 0l2 2" />
        <path d="M28 18l-5-5c-1.5-1.5-3.5-1.5-5 0l-6 6c-1 1-1 2.5 0 3.5s2.5 1 3.5 0l2-2" />
        <path d="M9 23l3 3c1 1 2.5 1 3.5 0l6.5-6.5" />
        <path d="M4 18l3 3M28 18l-3 3" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M16 5 4 26h24z" />
      <path d="m16 5 0 0M16 26l-4-8h8z" />
      <path d="M2 26h28" />
    </svg>
  );
}
