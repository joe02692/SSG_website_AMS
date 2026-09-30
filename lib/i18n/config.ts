/**
 * Languages the site speaks. English is the default; Arabic is right-to-left.
 *
 * The choice is kept in a cookie (not in the URL), so every existing link,
 * redirect and bookmark keeps working in both languages. A visitor with no
 * cookie gets Arabic if their browser asks for it first, English otherwise.
 */
export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
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
