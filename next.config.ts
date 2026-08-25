import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
