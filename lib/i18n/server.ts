import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/lib/i18n/config";
import { dictionaries, type Dictionary } from "@/lib/i18n/dictionaries";

/** The visitor's language: their saved choice, else Arabic (the site's main language). */
export const getLocale = cache(async (): Promise<Locale> => {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  return DEFAULT_LOCALE;
});

/** The words for the visitor's language. */
export const getT = cache(async (): Promise<Dictionary> => {
  return dictionaries[await getLocale()];
});
