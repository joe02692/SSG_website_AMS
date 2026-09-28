import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
