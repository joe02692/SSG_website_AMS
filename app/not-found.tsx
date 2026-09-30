import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getT()).pages.notFound;
  return { title: t.metaTitle, robots: { index: false } };
}

/** Shown for any address that doesn't exist, and for notFound() calls. */
export default async function NotFound() {
  const t = (await getT()).pages.notFound;
  const links = [
    { href: "/history", label: t.history },
    { href: "/stages", label: t.stages },
    { href: "/gallery", label: t.gallery },
  ];
  return (
    <SiteShell>
      <section className="mx-auto flex w-[calc(100%-40px)] max-w-[640px] flex-col items-center py-16 text-center sm:py-24">
        <p aria-hidden className="font-display text-[clamp(72px,18vw,128px)] font-extrabold leading-none text-sun [text-shadow:3px_3px_0_var(--color-forest)]">
          404
        </p>
        <h1 className="mt-4 text-[clamp(24px,4.5vw,32px)] leading-tight text-maroon">
          {t.heading}
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">
          {t.body}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-md bg-forest px-6 py-2.5 text-sm font-bold text-cream transition hover:opacity-90"
          >
            {t.home}
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-sun px-6 py-2.5 text-sm font-bold text-forest transition hover:opacity-90"
          >
            {t.joinUs}
          </Link>
        </div>
        <ul className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
          {links.map((l) => (
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
