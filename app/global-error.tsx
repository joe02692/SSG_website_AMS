"use client";

import "./globals.css";

/**
 * Last line of defence: shown only if the root layout itself fails, so it
 * brings its own <html> and <body> and depends on nothing else in the app.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-cream px-5 text-center font-sans">
        <title>Something went wrong · El-Salam Scouting Group</title>
        <h1 className="text-3xl text-maroon">Something went wrong</h1>
        <p className="mt-3 max-w-md text-[15px] text-forest/80">
          The site couldn&apos;t load just now. Please try again in a moment.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-6 rounded-md bg-forest px-6 py-2.5 text-sm font-bold text-cream"
        >
          Try again
        </button>
        {error.digest ? (
          <p className="mt-6 text-xs text-forest/70">Code: {error.digest}</p>
        ) : null}
      </body>
    </html>
  );
}
