/**
 * A die-cut "Under construction" sticker: a half-pitched tent in a hard hat,
 * traffic cones, hazard tape and a slight tilt. It wobbles gently, except for
 * people who have asked their device for reduced motion. Decorative only —
 * the page's heading says the same thing in words.
 */
export function ConstructionSticker({ top, bottom }: { top: string; bottom: string }) {
  return (
    <div aria-hidden className="sticker-wobble relative w-[min(78vw,300px)] -rotate-6">
      <svg viewBox="0 0 300 300" className="w-full drop-shadow-[0_10px_18px_rgb(30_68_40/0.28)]">
        <defs>
          <pattern id="hazard" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="24" height="24" fill="#ffdd32" />
            <rect width="12" height="24" fill="#1e4428" />
          </pattern>
          <path id="arc-top" d="M50 150 A100 100 0 0 1 250 150" />
          <path id="arc-bottom" d="M40 150 A110 110 0 0 0 260 150" />
        </defs>

        {/* White die-cut edge, then the sticker face */}
        <circle cx="150" cy="150" r="146" fill="#fff" />
        <circle cx="150" cy="150" r="136" fill="#fff9ea" stroke="#1e4428" strokeWidth="4" />

        {/* Curved lettering */}
        <text fontFamily="var(--font-display), sans-serif" fontWeight="800" fontSize="22" letterSpacing="3" fill="#912e37">
          <textPath href="#arc-top" startOffset="50%" textAnchor="middle">{top}</textPath>
        </text>
        <text fontFamily="var(--font-display), sans-serif" fontWeight="700" fontSize="15" letterSpacing="2" fill="#1e4428">
          <textPath href="#arc-bottom" startOffset="50%" textAnchor="middle" dominantBaseline="hanging">
            {bottom}
          </textPath>
        </text>

        {/* Ground */}
        <path d="M72 200 H228" stroke="#1e4428" strokeWidth="4" strokeLinecap="round" />

        {/* A half-pitched tent, one peg still loose */}
        <path d="M150 102 L100 200 H200 Z" fill="#377b49" />
        <path d="M150 102 L136 200 H166 Z" fill="#1e4428" />
        <path d="M200 200 L214 186" stroke="#1e4428" strokeWidth="3" strokeLinecap="round" />
        <path d="M150 102 L100 200" stroke="#fff9ea" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />

        {/* ...wearing a hard hat */}
        <path d="M130 104 a20 17 0 0 1 40 0 Z" fill="#ffdd32" stroke="#1e4428" strokeWidth="3" strokeLinejoin="round" />
        <rect x="124" y="102" width="52" height="6" rx="3" fill="#ffdd32" stroke="#1e4428" strokeWidth="3" />
        <path d="M150 88 V100" stroke="#1e4428" strokeWidth="2.5" />

        {/* Traffic cones either side */}
        {[78, 196].map((x) => (
          <g key={x}>
            <path d={`M${x + 4} 200 L${x + 11} 168 H${x + 17} L${x + 24} 200 Z`} fill="#f28c28" />
            <path d={`M${x + 8} 182 H${x + 20} M${x + 6} 192 H${x + 22}`} stroke="#fff" strokeWidth="4" />
            <rect x={x} y="198" width="28" height="5" rx="2" fill="#1e4428" />
          </g>
        ))}

        {/* Hazard tape */}
        <rect x="86" y="209" width="128" height="14" rx="3" fill="url(#hazard)" transform="rotate(-3 150 216)" />

        {/* Sweat drops — pitching a tent is hard work */}
        <path d="M184 96 q4 6 0 9 q-4 -3 0 -9Z M194 110 q3 5 0 7 q-3 -2 0 -7Z" fill="#377b49" />
      </svg>
    </div>
  );
}
