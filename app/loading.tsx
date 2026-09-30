import { getT } from "@/lib/i18n/server";

/**
 * Shown instantly while a page that reads live data (dashboard, members,
 * gallery) is being prepared, so a tap always gets a response. It looks like
 * the page chrome with grey placeholder blocks where the content will go.
 */
export default async function Loading() {
  const t = await getT();
  return (
    <div role="status" aria-live="polite" className="flex flex-1 flex-col">
      <span className="sr-only">{t.pages.loading}</span>
      <div aria-hidden className="h-[72px] bg-forest" />
      <div aria-hidden className="h-1.5 bg-sun" />
      <div aria-hidden className="mx-auto w-[calc(100%-40px)] max-w-[1100px] animate-pulse py-10 motion-reduce:animate-none">
        <div className="h-4 w-24 rounded bg-line" />
        <div className="mt-3 h-9 w-2/3 max-w-sm rounded bg-line" />
        <div className="mt-3 h-4 w-full max-w-lg rounded bg-line/70" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-line/60" />
          ))}
        </div>
      </div>
    </div>
  );
}
