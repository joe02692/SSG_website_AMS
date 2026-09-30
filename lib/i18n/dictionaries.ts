import chrome from "@/lib/i18n/dict/chrome";
import home from "@/lib/i18n/dict/home";
import history from "@/lib/i18n/dict/history";
import gallery from "@/lib/i18n/dict/gallery";
import pages from "@/lib/i18n/dict/pages";
import auth from "@/lib/i18n/dict/auth";
import roles from "@/lib/i18n/dict/roles";
import stages from "@/lib/i18n/dict/stages";
import account from "@/lib/i18n/dict/account";
import members from "@/lib/i18n/dict/members";

/**
 * Every user-facing word on the site, in English and Arabic.
 *
 * One module per area under lib/i18n/dict/. Each declares its Arabic as
 * `typeof en`, so TypeScript refuses to build if a key is missing in either
 * language. Content that lives in lib/site-content.ts (slides, goals, camps…)
 * is translated in lib/i18n/content.ts instead.
 */
export const dictionaries = {
  en: {
    chrome: chrome.en,
    home: home.en,
    history: history.en,
    gallery: gallery.en,
    pages: pages.en,
    auth: auth.en,
    roles: roles.en,
    stages: stages.en,
    account: account.en,
    members: members.en,
  },
  ar: {
    chrome: chrome.ar,
    home: home.ar,
    history: history.ar,
    gallery: gallery.ar,
    pages: pages.ar,
    auth: auth.ar,
    roles: roles.ar,
    stages: stages.ar,
    account: account.ar,
    members: members.ar,
  },
};

export type Dictionary = (typeof dictionaries)["en"];
