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
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];


const nextConfig: NextConfig = {
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
