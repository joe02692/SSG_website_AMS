import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

const LINKS = [
  { href: "/history", label: "Our History" },
  { href: "/stages", label: "Our Stages" },
  { href: "/gallery", label: "Camp Gallery" },
];

/** Shown for any address that doesn't exist, and for notFound() calls. */
export default function NotFound() {
  return (
    <SiteShell>
      <section className="mx-auto flex w-[calc(100%-40px)] max-w-[640px] flex-col items-center py-16 text-center sm:py-24">
        <p aria-hidden className="font-display text-[clamp(72px,18vw,128px)] font-extrabold leading-none text-sun [text-shadow:3px_3px_0_var(--color-forest)]">
          404
        </p>
        <h1 className="mt-4 text-[clamp(24px,4.5vw,32px)] leading-tight text-maroon">
          This trail doesn&apos;t lead anywhere
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">
          The page may have moved, or the link may have a typo. Let&apos;s get
          you back to camp.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-md bg-forest px-6 py-2.5 text-sm font-bold text-cream transition hover:opacity-90"
          >
            Back to the homepage
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-sun px-6 py-2.5 text-sm font-bold text-forest transition hover:opacity-90"
          >
            Join Us
          </Link>
        </div>
        <ul className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="font-semibold text-maroon underline underline-offset-4 hover:opacity-75">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </SiteShell>
  );
}
