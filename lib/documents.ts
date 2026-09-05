/**
 * Shared constants for scout documents.
 *
 * In its own module rather than alongside the Server Actions: a "use server"
 * file may only export async functions, so exporting a plain constant from
 * there is a build error.
 */

export const DOCUMENT_BUCKET = "scout-documents";

/** Days a certificate is kept before the nightly job deletes it. */
export function documentRetentionDays(): number {
  const raw = Number(process.env.DOCUMENT_RETENTION_DAYS);
  if (!Number.isFinite(raw) || raw < 1) return 30;
  return Math.floor(raw);
}
