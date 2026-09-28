import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";
import { PRIVATE_PATHS } from "@/lib/private-paths";

/** Search engines may read the public pages only. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
