/**
 * Languages the site speaks. Arabic (right-to-left) is the main language —
 * every first visit opens in Arabic (Zyad's decision, 30 Sep 2026).
 *
 * The choice is kept in a cookie (not in the URL), so every existing link,
 * redirect and bookmark keeps working in both languages. Pressing "EN" saves
 * English for that visitor from then on.
 */
export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ar";
export const LOCALE_COOKIE = "lang";

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "ar";
}

export function dirOf(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

/** For Intl date/number formatting. Western digits in both languages, so
 *  phone numbers, years and counts read the same everywhere on the site. */
export function intlLocale(locale: Locale): string {
  return locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB";
}
