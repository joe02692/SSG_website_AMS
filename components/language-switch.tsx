import { setLocaleAction } from "@/app/i18n-actions";
import { getLocale, getT } from "@/lib/i18n/server";

/**
 * English ⇄ العربية. A plain form posting to a Server Action, so it works
 * before any JavaScript has loaded; the action saves the choice in a cookie
 * and the page re-renders in place in the other language.
 *
 * The label is always written in the language you'd switch TO, and marked
 * with that language — a screen reader pronounces it correctly, and someone
 * who can't read the current language can still find their own.
 */
export async function LanguageSwitch({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const locale = await getLocale();
  const t = await getT();
  const target = locale === "ar" ? "en" : "ar";

  return (
    <form action={setLocaleAction} className={compact ? "contents" : "block"}>
      <input type="hidden" name="locale" value={target} />
      <button
        type="submit"
        aria-label={t.chrome.switchToLabel}
        className={
          compact
            ? `items-center gap-1.5 whitespace-nowrap rounded-md border-2 border-white/40 px-2.5 py-1.5 text-sm font-bold text-white transition hover:border-white ${className}`
            : `flex items-center gap-2 ${className}`
        }
      >
        <svg aria-hidden viewBox="0 0 20 20" className={`size-4 shrink-0 ${compact ? "lg:max-xl:hidden" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="10" cy="10" r="8" />
          <path d="M2 10h16M10 2c2.2 2.2 3.2 4.8 3.2 8s-1 5.8-3.2 8c-2.2-2.2-3.2-4.8-3.2-8s1-5.8 3.2-8z" />
        </svg>
        {/* Only the label is marked as the other language, so the button
            itself still lines up with the menu it sits in. */}
        <span lang={target} dir={target === "ar" ? "rtl" : "ltr"}>
          {compact ? t.chrome.switchTo : t.chrome.switchToFull}
        </span>
      </button>
    </form>
  );
}
