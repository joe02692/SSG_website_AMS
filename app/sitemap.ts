import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";
import { cloudinaryConfigured, getAlbums } from "@/lib/cloudinary";

/** Rebuilt at most once an hour, the same as the gallery. */
export const revalidate = 3600;

/** Every public page, plus one entry per photo album. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/history`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/stages`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/gallery`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/signup`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${SITE_URL}/login`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const albums = cloudinaryConfigured() ? await getAlbums() : [];
  return [
    ...pages,
    ...albums.map((album) => ({
      url: `${SITE_URL}/gallery/${album.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
  ];
}
