/**
 * The faint outdoor scenery behind the History page — mountains, pine
 * forests, a tent and a few birds, in a sandy tint of the cream so they
 * read as paper texture, not pictures. Pure decoration: aria-hidden and
 * never in the way of a click.
 */
const INK = "#e3d6b8";
const SNOW = "#f3ead5";

type Paint = { className: string; ink?: string; snow?: string };

export function Mountains({ className, ink = INK, snow = SNOW }: Paint) {
  return (
    <svg viewBox="0 0 320 140" className={className} fill={ink}>
      <path d="M0 140 70 52l28 30 52-66 70 82 30-26 70 68Z" />
      <path d="m150 16-15 19 10-3 5 8 6-9 9 5Z" fill={snow} />
      <path d="m70 52-10 13 7-2 3 6 5-7 6 3Z" fill={snow} />
    </svg>
  );
}

export function Pines({ className, ink = INK }: Paint) {
  // Three stacked triangles on a short trunk.
  const tree = (x: number, h: number, key: number) => {
    const top = 156 - h;
    const tier = (i: number) => {
      const y = top + i * h * 0.24;
      const w = h * (0.16 + i * 0.07);
      const bottom = y + h * 0.4;
      return `M${x} ${y}L${x + w} ${bottom}H${x - w}Z`;
    };
    return (
      <path
        key={key}
        d={`${tier(0)}${tier(1)}${tier(2)}M${x - h * 0.03} ${top + h * 0.88}h${h * 0.06}V156h-${h * 0.06}Z`}
      />
    );
  };
  return (
    <svg viewBox="0 0 300 160" className={className} fill={ink}>
      {[
        [30, 120],
        [75, 150],
        [120, 100],
        [160, 135],
        [205, 90],
        [245, 125],
        [280, 80],
      ].map(([x, h], i) => tree(x, h, i))}
      <path d="M0 160c60-14 120-14 180-6s90 4 120-2v8Z" />
    </svg>
  );
}

export function Tent({ className, ink = INK, snow = SNOW }: Paint) {
  return (
    <svg viewBox="0 0 200 120" className={className} fill={ink}>
      <path d="M100 8 18 110h164Z" />
      <path d="M100 8 70 110h60Z" fill={snow} />
      <path d="M100 8v-6M0 112h200" stroke={ink} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function Birds({ className, ink = INK }: Paint) {
  return (
    <svg viewBox="0 0 160 70" className={className} fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 40q10-10 18 0q8-10 18 0" />
      <path d="M70 18q8-8 14 0q6-8 14 0" />
      <path d="M112 44q9-9 16 0q7-9 16 0" />
    </svg>
  );
}

export function Scenery() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
      <Mountains className="absolute left-[-40px] top-[210px] hidden w-[380px] opacity-80 sm:block" />
      <Birds className="absolute right-[6%] top-[220px] w-28 sm:w-36" />
      <Pines className="absolute left-[-30px] top-[26%] hidden w-[340px] sm:block" />
      <Tent className="absolute right-[3%] top-[38%] hidden w-48 sm:block" />
      <Mountains className="absolute right-[-50px] top-[52%] hidden w-[360px] -scale-x-100 sm:block" />
      <Birds className="absolute left-[8%] top-[62%] hidden w-32 sm:block" />
      <Pines className="absolute right-[-30px] top-[76%] hidden w-[340px] -scale-x-100 sm:block" />
      <Tent className="absolute left-[4%] bottom-[4%] hidden w-44 sm:block" />
      <Pines className="absolute bottom-0 left-[-20px] w-[300px] opacity-70 sm:hidden" />
    </div>
  );
}
