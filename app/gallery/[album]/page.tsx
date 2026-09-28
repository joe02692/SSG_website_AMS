import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { PageBanner } from "@/components/page-banner";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { cloudinaryConfigured, getAlbumPhotos, photoUrl } from "@/lib/cloudinary";

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
    name: photos[0].album ?? titleFromSlug(slug),
  };
}

export async function generateMetadata(props: {
  params: Promise<{ album: string }>;
}): Promise<Metadata> {
  const { album } = await props.params;
  const data = await load(album);
  if (!data) return { title: "Camp Gallery" };
  const description = `${data.photos.length} photos from ${data.name} — El-Salam Scouting Group.`;
  return {
    title: `${data.name} — Camp Gallery`,
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

  return (
    <SiteShell>
      <PageBanner title={data.name} eyebrow="Camp Gallery">
        {data.photos.length} {data.photos.length === 1 ? "photo" : "photos"}. Tap
        any photo to see it full size.
      </PageBanner>
      <section className="mx-auto w-[calc(100%-40px)] max-w-[1100px] pb-16">
        <Link
          href="/gallery"
          className="mt-6 inline-block text-sm font-semibold text-maroon underline underline-offset-4 hover:opacity-75"
        >
          ← All albums
        </Link>
        <GalleryGrid
          items={data.photos.map((photo, i) => ({
            id: photo.publicId,
            alt: photo.caption || `Photo ${i + 1} from ${data.name}`,
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
