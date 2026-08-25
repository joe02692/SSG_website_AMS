import Image from "next/image";

/**
 * Camp gallery.
 *
 * Week 2 ships the grid with placeholders. To go live, drop Cloudinary
 * public IDs into `CAMP_PHOTOS` — `next.config.ts` already allows
 * res.cloudinary.com through `images.remotePatterns`, and the f_auto/q_auto
 * transform lets Cloudinary pick format and compression per browser.
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

type CampPhoto = {
  /** Cloudinary public ID, e.g. "camps/2025/summer-01" */
  publicId?: string;
  caption: string;
  year: string;
};

const CAMP_PHOTOS: CampPhoto[] = [
  { caption: "Summer camp — flag ceremony", year: "2025" },
  { caption: "Pioneering project", year: "2025" },
  { caption: "Coastal hike", year: "2024" },
  { caption: "Campfire evening", year: "2024" },
  { caption: "Community service day", year: "2024" },
  { caption: "First-aid training", year: "2023" },
];

function cloudinaryUrl(publicId: string, width: number) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_fill,g_auto,w_${width}/${publicId}`;
}

export function CampGallery() {
  return (
    <section
      id="gallery"
      aria-labelledby="gallery-heading"
      className="border-t border-line bg-surface py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 max-w-2xl">
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
            Weekend hikes, summer camps and service projects — a look at what a
            year with El-Salam involves.
          </p>
        </div>

        <ul
          role="list"
          className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3"
        >
          {CAMP_PHOTOS.map((photo, index) => {
            const isLive = Boolean(photo.publicId && CLOUD_NAME);

            return (
              <li
                key={photo.caption}
                className="group relative aspect-4/3 overflow-hidden rounded-xl border border-line bg-surface-raised"
              >
                {isLive ? (
                  <Image
                    src={cloudinaryUrl(photo.publicId!, 800)}
                    alt={photo.caption}
                    fill
                    sizes="(min-width: 768px) 33vw, 50vw"
                    className="object-cover transition duration-300 group-hover:scale-105"
                    priority={index < 3}
                  />
                ) : (
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
                )}

                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-3 pt-8">
                  <p className="text-xs font-medium text-white">
                    {photo.caption}
                  </p>
                  <p className="text-[11px] text-white/70">{photo.year}</p>
                </div>
              </li>
            );
          })}
        </ul>

        {!CLOUD_NAME ? (
          <p className="mt-6 text-xs text-ink-subtle">
            Placeholder tiles are showing. Set{" "}
            <code className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[11px]">
              NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
            </code>{" "}
            and add public IDs in{" "}
            <code className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[11px]">
              components/landing/camp-gallery.tsx
            </code>{" "}
            to go live.
          </p>
        ) : null}
      </div>
    </section>
  );
}
