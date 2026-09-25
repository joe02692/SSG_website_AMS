/** Heading block at the top of each sign-in page, per the design. */
export function AuthIntro({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      {/* Maroon, not the design's yellow: yellow on the cream is 1.28:1. */}
      <h1 className="text-[26px] leading-[1.05] text-maroon sm:text-4xl">{title}</h1>
      <p className="mt-2 text-base font-medium leading-snug text-ink sm:text-xl">{children}</p>
    </div>
  );
}
