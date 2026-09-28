/**
 * The site's public address, for links that leave the site: sitemap,
 * robots.txt, share previews and emails.
 *
 * Set NEXT_PUBLIC_SITE_URL once a custom domain is bought; until then the
 * Vercel address is used. Never ends in a slash.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ssg-website-ams.vercel.app"
).replace(/\/+$/, "");
