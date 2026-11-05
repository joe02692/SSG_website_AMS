import type { NextConfig } from "next";
import { PRIVATE_PATHS } from "./lib/private-paths";

/**
 * Sent with every response. Each closes off a common attack:
 * - frame-ancestors / X-Frame-Options: no other site can load ours in a
 *   hidden frame and trick someone into clicking "Approve" (clickjacking).
 * - nosniff: a file is only ever treated as the type we said it was.
 * - Referrer-Policy: other sites see our domain, never a full members' URL.
 * - Permissions-Policy: the site never asks for the camera, microphone or
 *   location (uploading a photo of a document still works — that's a file
 *   picker, not camera access).
 * - HSTS: browsers only ever use HTTPS for this site.
 */
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Our pages get their own browsing-context group: a page opened from (or
  // opening) another site can't reach into ours through window.opener.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Other websites can't embed our files (photos, scripts) in their pages.
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
];
// The full Content-Security-Policy (scripts, styles, images, connections) is
// set per request in lib/supabase/proxy.ts, because it carries a fresh nonce.
// (X-Frame-Options above still stops framing on responses the proxy skips.)


const nextConfig: NextConfig = {
  // Don't advertise "X-Powered-By: Next.js" (flagged by Seobility and
  // securityheaders.com — it only helps someone looking for known holes).
  poweredByHeader: false,
  // experimental.inlineCss was tried (1 Nov 2026) and rejected: Next embeds the
  // 79 KB stylesheet twice in every page (a <style> tag and the React payload),
  // tripling the HTML for a ~140 ms gain. The cached external file is better.
  // The members area was renamed "Admin" (Oct 2026). Old bookmarks and links
  // in earlier emails still land in the right place.
  async redirects() {
    return [
      { source: "/members", destination: "/admin", permanent: true },
      { source: "/members/:path*", destination: "/admin/:path*", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // Members' pages and password pages stay out of search results even if
      // someone links to them (robots.txt alone doesn't guarantee that).
      ...PRIVATE_PATHS.flatMap((path) =>
        [path, `${path}/:path*`].map((source) => ({
          source,
          headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
        })),
      ),
    ];
  },
  images: {
    // The photos in /public never change once deployed, so a resized copy can
    // be kept for 31 days rather than re-made every few hours. On Vercel's
    // Hobby plan, image transformations are capped at 5,000 a month and new
    // images stop loading once that's used up — this keeps us far below it.
    // (Cloudinary photos don't count: they use a Cloudinary loader and are
    // resized by Cloudinary, see components/gallery/photo.tsx.)
    minimumCacheTTL: 2678400,
    // AVIF first: noticeably sharper than WebP at the same size, so the big
    // homepage photos look better without getting heavier. Browsers without
    // AVIF get WebP.
    formats: ["image/avif", "image/webp"],
    // Next's default widths jump from 1200 to 1920, so a laptop showing the
    // homepage photo ~1340px wide was sent the 1920px file (PageSpeed: "Improve
    // image delivery", ~190 KB wasted). 1440 and 1680 fill that gap, and
    // 384/480 serve the ~360px homepage cards instead of a 640px file.
    deviceSizes: [384, 480, 640, 750, 828, 1080, 1200, 1440, 1680, 1920, 2048, 3840],
    // 75 is the default everywhere; 90 is used only for the homepage's
    // full-width photos, where compression smudging is most visible.
    qualities: [75, 90],
    // Camp photography is served from Cloudinary so it never touches the
    // Supabase storage quota. `images.domains` was deprecated in Next 16 —
    // remotePatterns is the supported form.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
