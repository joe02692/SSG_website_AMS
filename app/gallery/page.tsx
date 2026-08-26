import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { cloudinaryConfigured, getAlbums, photoUrl } from "@/lib/cloudinary";

export const metadata: Metadata = {
  title: "Camp gallery",
  description:
    "Photo albums from El-Salam Scouting Group camps, hikes and events.",
};

export default async function GalleryPage() {
  const albums = cloudinaryConfigured() ? await getAlbums() : [];

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
            Camp gallery
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Albums
          </h1>
          <p className="mt-3 text-ink-muted">
            Every camp, hike and event — one album at a time.
          </p>
        </div>

        {albums.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-10 text-center">
            <p className="text-lg font-medium text-ink">No albums yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
              Photos will appear here automatically once they&apos;re added to
              the group&apos;s photo library. Check back after the next camp!
            </p>
          </div>
        ) : (
          <ul
            role="list"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {albums.map((album) => (
              <li key={album.path}>
                <Link
                  href={`/gallery/${encodeURIComponent(album.slug)}`}
                  className="group block overflow-hidden rounded-xl border border-line bg-surface-raised transition hover:border-brand-300 hover:shadow-md"
                >
                  <div className="relative aspect-4/3 overflow-hidden bg-surface">
                    {album.cover ? (
                      <Image
                        src={photoUrl(album.cover.publicId, 800)}
                        alt={`Cover photo of ${album.name}`}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : null}
                  </div>
                  <div className="flex items-baseline justify-between gap-3 p-4">
                    <h2 className="truncate text-base font-semibold text-ink">
                      {album.name}
                    </h2>
                    <p className="shrink-0 text-xs text-ink-subtle">
                      {album.photoCount}{" "}
                      {album.photoCount === 1 ? "photo" : "photos"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SiteShell>
  );
}
