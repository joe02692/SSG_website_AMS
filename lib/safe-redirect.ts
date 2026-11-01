/**
 * A post-login / post-confirmation destination that can only ever be a page
 * on this site.
 *
 * Checking `startsWith("/") && !startsWith("//")` is NOT enough: browsers
 * read a backslash as a slash, so "/\evil.com" becomes "//evil.com" — another
 * website. Tabs and newlines are stripped by URL parsing too ("/\t/evil.com").
 * So anything with a backslash or a control character is refused, and the
 * result is parsed against a dummy origin to make sure it stays on it.
 */
export function safeRedirectPath(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return fallback;
  try {
    const base = "https://site.invalid";
    const url = new URL(raw, base);
    if (url.origin !== base) return fallback;
    const path = `${url.pathname}${url.search}${url.hash}`;
    // "/..//evil.com" normalises to "//evil.com": check the result again.
    return path.startsWith("//") ? fallback : path;
  } catch {
    return fallback;
  }
}
