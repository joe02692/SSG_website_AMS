import type { Metadata } from "next";
import { SiteShell } from "@/components/site-shell";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { AlbumCard } from "@/components/gallery/album-card";
import { PageBanner } from "@/components/page-banner";
import { cloudinaryConfigured, getAlbums } from "@/lib/cloudinary";
import { getLocale, getT } from "@/lib/i18n/server";
import { localizedAlbumName, localizedGallery } from "@/lib/i18n/content";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getT()).gallery;
  return { title: t.metaTitle, description: t.metaDescription };
}

/**
 * Albums from Cloudinary — one per folder inside `gallery/`, added with
 * scripts/upload-gallery.mjs or by dragging a folder into the Media Library.
 *
 * If Cloudinary isn't configured on a deployment, or has no albums yet, the
 * page shows the design's eight photos instead of an empty state, so the
 * public site never looks unfinished.
 */
export default async function GalleryPage() {
  const locale = await getLocale();
  const t = (await getT()).gallery;
  const albums = (cloudinaryConfigured() ? await getAlbums() : []).map((album) => ({
    ...album,
    name: localizedAlbumName(album.name, locale),
  }));

  return (
    <SiteShell>
      <PageBanner title={t.title} eyebrow={t.eyebrow}>
        {albums.length ? t.introAlbums : t.introPhotos}
      </PageBanner>
      <section className="mx-auto w-[calc(100%-40px)] max-w-[1100px] pb-16">
        {albums.length ? (
          <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album, i) => (
              <li key={album.slug} className="reveal">
                <AlbumCard album={album} priority={i < 3} photoCount={t.photoCount(album.photoCount)} />
              </li>
            ))}
          </ul>
        ) : (
          <GalleryGrid
            items={localizedGallery(locale).map((photo) => ({
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
