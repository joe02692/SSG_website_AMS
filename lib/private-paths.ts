/**
 * Pages that must never appear in search results: everything behind a login,
 * plus the password pages. Used by robots.txt (app/robots.ts) and by the
 * `X-Robots-Tag: noindex` header (next.config.ts) — the header is what
 * actually keeps a page out of Google if someone links to it.
 */
export const PRIVATE_PATHS = [
  "/dashboard",
  "/members",
  "/onboarding",
  "/pending",
  "/auth",
  "/api",
  "/reset-password",
  "/forgot-password",
];
