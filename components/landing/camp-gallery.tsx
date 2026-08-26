import Image from "next/image";
import Link from "next/link";
import {
  cloudinaryConfigured,
  getLatestPhotos,
  photoUrl,
} from "@/lib/cloudinary";

/**
 * Landing-page camp gallery.
 *
 * Shows the six newest photos across all albums in the Cloudinary
 * `gallery/` folder. Until credentials are configured (or while there are
 * no photos yet), it renders branded placeholder tiles instead — the page
 * never breaks, it just isn't live yet.
 */

const PLACEHOLDERS = [
  { caption: "Summer camp — flag ceremony", year: "2025" },
  { caption: "Pioneering project", year: "2025" },
  { caption: "Coastal hike", year: "2024" },
  { caption: "Campfire evening", year: "2024" },
  { caption: "Community service day", year: "2024" },
  { caption: "First-aid training", year: "2023" },
];

function PlaceholderTile({
  caption,
  year,
}: {
  caption: string;
  year: string;
}) {
  return (
    <li className="group relative aspect-4/3 overflow-hidden rounded-xl border border-line bg-surface-raised">
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-br from-brand-100 to-brand-200 dark:from-brand-950 dark:to-brand-900"
      >
        <div className="grid h-full place-items-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            className="size-9 text-brand-700/50 dark:text-brand-300/40"
          >
            <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h15A1.5 1.5 0 0 1 21 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-13Z" />
            <path d="m3 16 5-4 4 3 3.5-3L21 16" />
            <circle cx="8.5" cy="9" r="1.5" />
          </svg>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-3 pt-8">
        <p className="text-xs font-medium text-white">{caption}</p>
        <p className="text-[11px] text-white/70">{year}</p>
      </div>
    </li>
  );
}

export async function CampGallery() {
  const photos = cloudinaryConfigured() ? await getLatestPhotos(6) : [];
  const live = photos.length > 0;

  return (
    <section
      id="gallery"
      aria-labelledby="gallery-heading"
      className="border-t border-line bg-surface py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
              Camp gallery
            </p>
            <h2
              id="gallery-heading"
              className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
            >
              Where the learning actually happens
            </h2>
            <p className="mt-3 text-ink-muted">
              Weekend hikes, summer camps and service projects — a look at what
              a year with El-Salam involves.
            </p>
          </div>
          {live ? (
            <Link
              href="/gallery"
              className="rounded-lg border border-line bg-canvas px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-brand-300"
            >
              Browse all albums →
            </Link>
          ) : null}
        </div>

        <ul
          role="list"
          className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3"
        >
          {live
            ? photos.map((photo, index) => (
                <li
                  key={photo.publicId}
                  className="group relative aspect-4/3 overflow-hidden rounded-xl border border-line bg-surface-raised"
                >
                  <Link
                    href={`/gallery/${encodeURIComponent(photo.albumSlug)}`}
                    className="absolute inset-0"
                  >
                    <Image
                      src={photoUrl(photo.publicId, 800)}
                      alt={photo.caption}
                      fill
                      sizes="(min-width: 768px) 33vw, 50vw"
                      className="object-cover transition duration-300 group-hover:scale-105"
                      priority={index < 3}
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-3 pt-8">
                      <span className="block text-xs font-medium text-white">
                        {photo.caption}
                      </span>
                      <span className="block text-[11px] text-white/70">
                        {photo.albumName}
                      </span>
                    </span>
                  </Link>
                </li>
              ))
            : PLACEHOLDERS.map((tile) => (
                <PlaceholderTile key={tile.caption} {...tile} />
              ))}
        </ul>

        {!live ? (
          <p className="mt-6 text-xs text-ink-subtle">
            Placeholder tiles are showing. Add Cloudinary credentials to{" "}
            <code className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[11px]">
              .env.local
            </code>{" "}
            and put photos in the{" "}
            <code className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[11px]">
              gallery/
            </code>{" "}
            folder to go live.
          </p>
        ) : null}
      </div>
    </section>
  );
}
