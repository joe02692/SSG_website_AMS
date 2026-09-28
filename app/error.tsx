"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

/**
 * Shown when a page fails to load — usually Supabase or Cloudinary being
 * briefly unreachable. "Try again" re-renders just the failed page.
 *
 * It can't use the normal site header (that one reads the signed-in user on
 * the server), so it draws a plain version of it.
 */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Shows up in the Vercel function logs next to the server-side error.
    console.error(error);
  }, [error]);

  return (
    <>
      <header className="on-dark bg-forest">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center px-5 sm:px-8">
          <BrandLogo />
        </div>
        <div aria-hidden className="h-1.5 bg-sun" />
      </header>
      <main id="main" className="mx-auto flex w-[calc(100%-40px)] max-w-[600px] flex-1 flex-col items-center py-16 text-center sm:py-24">
        <span aria-hidden className="grid size-16 place-items-center rounded-full bg-sun text-3xl text-forest">
          ⛺
        </span>
        <h1 className="mt-5 text-[clamp(24px,4.5vw,32px)] leading-tight text-maroon">
          Something went wrong
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
          This page couldn&apos;t load just now. It&apos;s usually a short hiccup —
          please try again in a moment.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-md bg-forest px-6 py-2.5 text-sm font-bold text-cream transition hover:opacity-90"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-md border-2 border-forest px-6 py-2 text-sm font-bold text-forest transition hover:bg-forest/5"
          >
            Homepage
          </Link>
        </div>
        {error.digest ? (
          <p className="mt-8 text-xs text-ink-muted">
            If it keeps happening, send this code to the site admin:{" "}
            <code className="rounded bg-surface px-1.5 py-0.5 font-mono">{error.digest}</code>
          </p>
        ) : null}
      </main>
    </>
  );
}
