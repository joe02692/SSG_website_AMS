/** Lower-case, no Arabic diacritics / tatweel, unified alef/yaa/taa marbuta — so "احمد" finds "أحمد". */
export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}
