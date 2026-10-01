import { BannerScenery } from "@/components/green-scenery";

/**
 * The band at the top of every inner public page (Stages, Gallery):
 * forest background, a small yellow label above the page's title, and a
 * yellow stripe beneath — so each page opens the same way and it's obvious
 * which page you're on.
 */
export function PageBanner({
  title,
  eyebrow,
  children,
}: {
  title: string;
  /** Short label above the title, e.g. "Activities". */
  eyebrow: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="on-dark relative overflow-hidden bg-forest text-cream">
      <BannerScenery />
      <div className="relative mx-auto w-[calc(100%-40px)] max-w-[1100px] py-9 sm:py-11">
        <p className="w-fit font-display text-sm font-semibold uppercase tracking-[0.14em] text-sun">
          {eyebrow}
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
      <div aria-hidden className="relative h-1.5 bg-sun" />
    </section>
  );
}
