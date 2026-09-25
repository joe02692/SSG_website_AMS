/**
 * The band at the top of every inner public page (History, Stages, Gallery):
 * forest background, the page's Arabic name above its English one, and a
 * yellow stripe beneath — so each page opens the same way and it's obvious
 * which page you're on.
 */
export function PageBanner({
  title,
  arabic,
  children,
}: {
  title: string;
  arabic: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="on-dark relative bg-forest text-cream">
      <div className="mx-auto w-[calc(100%-40px)] max-w-[1100px] py-9 sm:py-11">
        <p lang="ar" dir="rtl" className="w-fit font-display text-base text-sun">
          {arabic}
        </p>
        <h1 className="mt-1 text-[clamp(26px,4.5vw,36px)] leading-tight text-white">
          {title}
        </h1>
        {children ? (
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-cream/85 sm:text-base">
            {children}
          </p>
        ) : null}
      </div>
      <div aria-hidden className="h-1.5 bg-sun" />
    </section>
  );
}
