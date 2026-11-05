/**
 * The site's Content-Security-Policy — the browser's list of where scripts,
 * styles, images and connections may come from. If an attacker ever got
 * HTML into a page (a crafted name, a bug), the browser would still refuse to
 * run their script.
 *
 * Built per request in the proxy (lib/supabase/proxy.ts) because scripts are
 * allowed by a one-time `nonce`: Next.js reads it from the request's CSP
 * header and stamps it on its own <script> tags. 'strict-dynamic' then lets
 * those trusted scripts load the rest (page chunks, Vercel Analytics).
 *
 * Where each outside origin comes from:
 *  - res.cloudinary.com  — gallery and camp photos (components/gallery/photo.tsx)
 *  - *.backblazeb2.com   — document uploads (presigned PUT from the browser)
 *                          and the document preview (image / PDF in an iframe)
 *  - vercel.live         — the Vercel toolbar on preview deployments only
 *
 * Styles allow 'unsafe-inline': the site uses style="" attributes (photo focus
 * points, the slideshow timer) and Next inlines the CSS (experimental.inlineCss).
 * Inline *styles* can't run code, so this does not weaken script protection.
 */
export function contentSecurityPolicy(nonce: string, supabaseOrigin: string): string {
  const dev = process.env.NODE_ENV === "development";
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://*.backblazeb2.com", "https://vercel.live", "https://vercel.com"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", supabaseOrigin, "https://*.backblazeb2.com", "https://vercel.live", ...(dev ? ["ws:"] : [])],
    "frame-src": ["'self'", "https://*.backblazeb2.com", "https://vercel.live"],
    "media-src": ["'self'"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const policy = Object.entries(directives)
    .map(([name, values]) => `${name} ${values.filter(Boolean).join(" ")}`)
    .join("; ");
  return dev ? policy : `${policy}; upgrade-insecure-requests`;
}

/** A fresh, unguessable value for each request. */
export function createNonce(): string {
  return btoa(crypto.randomUUID());
}
