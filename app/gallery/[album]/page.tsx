import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { PageBanner } from "@/components/page-banner";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { cloudinaryConfigured, getAlbumPhotos, photoUrl } from "@/lib/cloudinary";
import { getLocale, getT } from "@/lib/i18n/server";
import { localizedAlbumName } from "@/lib/i18n/content";

function titleFromSlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** The slug becomes part of a Cloudinary API path — keep it strictly boring. */
const SAFE_SLUG = /^[\w][\w -]*$/;

async function load(album: string) {
  const slug = decodeURIComponent(album);
  if (!SAFE_SLUG.test(slug) || !cloudinaryConfigured()) return null;
  const photos = await getAlbumPhotos(slug);
  if (photos.length === 0) return null;
  return {
    slug,
    photos,
    name: localizedAlbumName(photos[0].album ?? titleFromSlug(slug), await getLocale()),
  };
}

export async function generateMetadata(props: {
  params: Promise<{ album: string }>;
}): Promise<Metadata> {
  const { album } = await props.params;
  const data = await load(album);
  const t = (await getT()).gallery;
  if (!data) return { title: t.metaTitle };
  const description = t.albumMetaDescription(data.photos.length, data.name);
  return {
    title: t.albumMetaTitle(data.name),
    description,
    // Sharing an album shows its first photo rather than the site-wide image.
    openGraph: {
      title: data.name,
      description,
      images: [{ url: photoUrl(data.photos[0].publicId, 1200), width: 1200, height: 900 }],
    },
  };
}

export default async function AlbumPage(props: {
  // Next 16: params is a Promise — must be awaited.
  params: Promise<{ album: string }>;
}) {
  const { album } = await props.params;
  const data = await load(album);
  if (!data) notFound();
  const t = (await getT()).gallery;

  return (
    <SiteShell>
      <PageBanner title={data.name} eyebrow={t.title}>
        {t.albumIntro(data.photos.length)}
      </PageBanner>
      <section className="mx-auto w-[calc(100%-40px)] max-w-[1100px] pb-16">
        <Link
          href="/gallery"
          className="mt-6 inline-block text-sm font-semibold text-maroon underline underline-offset-4 hover:opacity-75"
        >
          <span aria-hidden className="inline-block rtl:-scale-x-100">←</span> {t.allAlbums}
        </Link>
        <GalleryGrid
          items={data.photos.map((photo, i) => ({
            id: photo.publicId,
            // Captions are camera file names ("Img 4305"), which describe
            // nothing — so every photo gets a numbered description instead.
            alt: t.photoAlt(i + 1, data.name),
            source: {
              kind: "cloudinary",
              publicId: photo.publicId,
              width: photo.width,
              height: photo.height,
            },
          }))}
        />
      </section>
    </SiteShell>
  );
}
