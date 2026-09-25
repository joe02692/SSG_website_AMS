/** Heading pair used across the public pages: maroon title, green subtitle. */
export function SectionHeading({
  id,
  title,
  subtitle,
  onDark = false,
}: {
  id: string;
  title: string;
  subtitle?: string;
  onDark?: boolean;
}) {
  return (
    <>
      <h2
        id={id}
        className={`text-[clamp(24px,4.5vw,32px)] leading-tight ${onDark ? "text-sun" : "text-maroon"}`}
      >
        {title}
      </h2>
      {subtitle ? (
        <p
          // On the green band the subtitle is bold and never below 19px:
          // butter on leaf is 4.38:1, which passes only as large text, and
          // bold text counts as large from 18.66px.
          className={`mt-1.5 leading-snug ${
            onDark
              ? "text-[clamp(19px,2.6vw,21px)] font-bold text-butter"
              : "text-[clamp(17px,2.6vw,21px)] font-medium text-brand-ink"
          }`}
        >
          {subtitle}
        </p>
      ) : null}
    </>
  );
}
