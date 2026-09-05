/**
 * Naming for scout documents.
 *
 * In its own module rather than alongside the Server Actions: a "use server"
 * file may only export async functions, so a plain helper cannot live there.
 *
 * (This file previously held DOCUMENT_BUCKET and documentRetentionDays. Both
 * belonged to the Supabase-Storage era and the abandoned auto-expiry job, and
 * nothing imported them any more.)
 */

/** Longest name fragment allowed in a key. Keeps paths and ZIP entries sane. */
const MAX_SLUG_LENGTH = 40;

/**
 * Turns a person's name into something safe to put in a filename.
 *
 * Keeps letters and digits in ANY script — most of our members' names are
 * Arabic, and stripping to ASCII would turn the whole roster into
 * "unnamed_a1b2c3d4.jpg", which defeats the point of naming the file after
 * the person. `\p{L}` with the `u` flag matches Arabic letters as readily as
 * Latin ones.
 *
 * Everything else — spaces, punctuation, path separators — becomes a single
 * hyphen. That matters beyond tidiness: a "/" in a name would invent a folder
 * inside the storage key, and a ".." would be worse.
 */
export function nameSlug(value: string | null | undefined): string {
  const cleaned = (value ?? "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    // A trailing hyphen can reappear after slicing mid-word.
    .replace(/-+$/g, "");

  return cleaned || "unnamed";
}

/**
 * Builds a Content-Disposition value that survives a non-ASCII filename.
 *
 * The plain `filename="..."` parameter is only defined for Latin-1, so an
 * Arabic name either arrives mangled or gets the header rejected. RFC 5987's
 * `filename*` carries the real UTF-8 name; the plain parameter stays as a
 * fallback for anything that ignores it. Both are required — sending only
 * `filename*` loses older clients, only `filename` loses the name.
 */
export function attachmentDisposition(filename: string): string {
  const fallback = filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "");
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${fallback || "document"}"; filename*=UTF-8''${encoded}`;
}
