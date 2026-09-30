"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";

/**
 * Saves the visitor's language. Setting a cookie in a Server Action makes
 * Next re-render the current page, so it switches in place — same page, same
 * scroll position, now in the other language.
 */
export async function setLocaleAction(formData: FormData) {
  const locale = formData.get("locale");
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
