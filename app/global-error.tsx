"use client";

import "./globals.css";
import { dictionaries } from "@/lib/i18n/dictionaries";

/**
 * Last line of defence: shown only if the root layout itself fails, so it
 * brings its own <html> and <body> and depends on nothing else in the app —
 * including the language, which the root layout would normally decide. So it
 * says everything in both English and Arabic.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const en = dictionaries.en.pages.error;
  const ar = dictionaries.ar.pages.error;
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-cream px-5 text-center font-sans">
        <title>{`${en.title} | ${ar.title}`}</title>
        <h1 className="text-3xl text-maroon">{en.heading}</h1>
        <p className="mt-3 max-w-md text-[15px] text-forest/80">{en.globalBody}</p>
        <div lang="ar" dir="rtl" className="mt-6">
          <p className="text-2xl text-maroon">{ar.heading}</p>
          <p className="mt-2 max-w-md text-[15px] text-forest/80">{ar.globalBody}</p>
        </div>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-6 rounded-md bg-forest px-6 py-2.5 text-sm font-bold text-cream"
        >
          {en.tryAgain} · <span lang="ar">{ar.tryAgain}</span>
        </button>
        {error.digest ? (
          <p className="mt-6 text-xs text-forest/70">
            {en.codeShort} <bdi dir="ltr">{error.digest}</bdi>
          </p>
        ) : null}
      </body>
    </html>
  );
}
