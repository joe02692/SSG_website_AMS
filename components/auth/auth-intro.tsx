/** Heading block at the top of each sign-in page, per the design. */
export function AuthIntro({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      {/* Maroon, not the design's yellow: yellow on the cream is 1.28:1. */}
      <h1 className="text-[24px] leading-[1.1] text-maroon sm:text-[30px]">{title}</h1>
      <p className="mt-1.5 text-[15px] font-medium leading-snug text-ink sm:text-[17px]">{children}</p>
    </div>
  );
}
