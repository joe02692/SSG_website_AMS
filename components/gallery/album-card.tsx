import Link from "next/link";
import { Photo } from "@/components/gallery/photo";
import type { GalleryAlbum } from "@/lib/cloudinary";

/** One album on /gallery: cover photo, name, count. */
export function AlbumCard({
  album,
  priority,
  photoCount,
}: {
  album: GalleryAlbum;
  priority?: boolean;
  /** "12 photos", already in the page's language. */
  photoCount: string;
}) {
  return (
    <Link
      href={`/gallery/${encodeURIComponent(album.slug)}`}
      className="group relative block aspect-4/3 overflow-hidden rounded-xl bg-forest"
    >
      {album.cover ? (
        <Photo
          source={{
            kind: "cloudinary",
            publicId: album.cover.publicId,
            width: album.cover.width,
            height: album.cover.height,
          }}
          alt=""
          priority={priority}
          sizes="(min-width: 1024px) 340px, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
      ) : null}
      <span
        aria-hidden
        className="absolute inset-0 bg-linear-to-t from-forest/90 via-forest/35 via-40% to-forest/5"
      />
      <span className="absolute inset-x-3.5 bottom-3 z-10 flex items-end justify-between gap-2 text-white">
        <span className="min-w-0">
          <span className="block text-[clamp(15px,3vw,17px)] font-semibold tracking-[0.03em]">
            {album.name}
          </span>
          <span className="block text-xs text-cream/85">
            {photoCount}
          </span>
        </span>
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-full bg-sun text-forest transition group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
        >
          →
        </span>
      </span>
    </Link>
  );
}
