import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import {
  cloudinaryConfigured,
  getAlbumPhotos,
  photoUrlFit,
} from "@/lib/cloudinary";

function titleFromSlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata(props: {
  params: Promise<{ album: string }>;
}): Promise<Metadata> {
  const { album } = await props.params;
  return {
    title: `${titleFromSlug(decodeURIComponent(album))} — Camp gallery`,
  };
}

export default async function AlbumPage(props: {
  // Next 16: params is a Promise — must be awaited.
  params: Promise<{ album: string }>;
}) {
  const { album } = await props.params;
  const slug = decodeURIComponent(album);

  // The slug becomes part of a Cloudinary API path — keep it strictly boring.
  if (!/^[\w][\w -]*$/.test(slug)) notFound();

  const photos = cloudinaryConfigured() ? await getAlbumPhotos(slug) : [];
  if (photos.length === 0) notFound();

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8">
          <Link
            href="/gallery"
            className="text-sm text-brand-700 underline-offset-4 hover:underline dark:text-brand-300"
          >
            ← All albums
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {titleFromSlug(slug)}
          </h1>
          <p className="mt-2 text-sm text-ink-subtle">
            {photos.length} {photos.length === 1 ? "photo" : "photos"}
          </p>
        </div>

        <ul role="list" className="columns-2 gap-3 md:columns-3 [&>li]:mb-3">
          {photos.map((photo, index) => (
            <li
              key={photo.publicId}
              className="break-inside-avoid overflow-hidden rounded-xl border border-line bg-surface"
            >
              <Image
                src={photoUrlFit(photo.publicId, 900)}
                alt={photo.caption}
                width={photo.width || 900}
                height={photo.height || 675}
                sizes="(min-width: 768px) 33vw, 50vw"
                className="h-auto w-full"
                priority={index < 4}
              />
            </li>
          ))}
        </ul>
      </div>
    </SiteShell>
  );
}
