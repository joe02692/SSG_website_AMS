import type { Metadata } from "next";
import { SiteShell } from "@/components/site-shell";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { AlbumCard } from "@/components/gallery/album-card";
import { PageBanner } from "@/components/page-banner";
import { cloudinaryConfigured, getAlbums } from "@/lib/cloudinary";
import { GALLERY } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Camp Gallery",
  description: "Photo albums from El-Salam Scouting Group camps, hikes and events.",
};

/**
 * Albums from Cloudinary — one per folder inside `gallery/`, added with
 * scripts/upload-gallery.mjs or by dragging a folder into the Media Library.
 *
 * If Cloudinary isn't configured on a deployment, or has no albums yet, the
 * page shows the design's eight photos instead of an empty state, so the
 * public site never looks unfinished.
 */
export default async function GalleryPage() {
  const albums = cloudinaryConfigured() ? await getAlbums() : [];

  return (
    <SiteShell>
      <PageBanner title="Camp Gallery" arabic="معرض الصور">
        {albums.length
          ? "Every camp, hike and event — one album at a time. Open an album to see all its photos."
          : "Every camp, hike and event — one album at a time. Tap a photo to see it full size."}
      </PageBanner>
      <section className="mx-auto w-[calc(100%-40px)] max-w-[1100px] pb-16">
        {albums.length ? (
          <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album, i) => (
              <li key={album.slug} className="reveal">
                <AlbumCard album={album} priority={i < 3} />
              </li>
            ))}
          </ul>
        ) : (
          <GalleryGrid
            items={GALLERY.map((photo) => ({
              id: photo.name,
              name: photo.name,
              alt: photo.alt,
              source: { kind: "static", image: photo.src },
            }))}
          />
        )}
      </section>
    </SiteShell>
  );
}
