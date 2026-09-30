"use client";

import { useEffect, useRef, useState } from "react";
import { Photo, type PhotoSource } from "@/components/gallery/photo";
import { LIGHT_DISMISS, lightDismissFallback } from "@/components/ui/dialog-utils";
import { useT } from "@/lib/i18n/client";

/**
 * Photo cards that open a full-screen viewer.
 *
 * The viewer is a native modal <dialog>: focus moves into it and back to the
 * card you clicked, Escape and a tap on the dark backdrop close it, and the
 * page behind is inert. ← / → step through the photos.
 */
export type GalleryItem = {
  id: string;
  /** Shown on the card and in the viewer header. Optional for album photos,
   *  where every card would otherwise repeat the album's name. */
  name?: string;
  alt: string;
  source: PhotoSource;
};

export function GalleryGrid({ items: albums }: { items: GalleryItem[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [current, setCurrent] = useState(0);
  const t = useT().gallery;

  useEffect(() => {
    const d = dialog.current;
    return d ? lightDismissFallback(d) : undefined;
  }, []);

  const open = (i: number) => {
    setCurrent(i);
    dialog.current?.showModal();
  };
  const step = (by: number) =>
    setCurrent((i) => (i + by + albums.length) % albums.length);

  const photo = albums[current];

  return (
    <>
      <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {albums.map((album, i) => (
          <li key={album.id} className="reveal">
            <button
              type="button"
              onClick={() => open(i)}
              aria-label={t.openPhoto(album.name ?? album.alt, i + 1, albums.length)}
              className="group relative block aspect-4/3 w-full overflow-hidden rounded-xl bg-forest text-start"
            >
              <Photo
                source={album.source}
                alt={album.alt}
                priority={i < 3}
                sizes="(min-width: 1024px) 340px, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
              {/* Darkening only where there's a caption to read over it. */}
              {album.name ? (
                <span
                  aria-hidden
                  className="absolute inset-0 bg-linear-to-t from-forest/90 via-forest/35 via-40% to-forest/5"
                />
              ) : null}
              <span className="absolute inset-x-3.5 bottom-3 z-10 flex items-end justify-between gap-2">
                <span className="text-[clamp(15px,3vw,17px)] font-semibold tracking-[0.03em] text-white">
                  {album.name ?? ""}
                </span>
                <span
                  aria-hidden
                  className="grid size-8 shrink-0 translate-y-1 place-items-center rounded-full bg-sun text-forest opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 13 13 3M6 3h7v7" />
                  </svg>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        {...LIGHT_DISMISS}
        aria-label={t.viewerLabel(photo.name, current + 1, albums.length)}
        onKeyDown={(e) => {
          // "Forward" is the reading direction: → in English, ← in Arabic.
          const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
          if (e.key === "ArrowRight") step(rtl ? -1 : 1);
          if (e.key === "ArrowLeft") step(rtl ? 1 : -1);
        }}
        className="lightbox on-dark m-auto h-[min(92dvh,900px)] max-h-none w-[min(96vw,1200px)] max-w-none bg-transparent p-0 text-white"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 px-1 pb-3">
            <p className="text-sm text-white/80">
              {photo.name ? (
                <>
                  <span className="font-semibold text-white">{photo.name}</span>
                  <span className="mx-2" aria-hidden>·</span>
                </>
              ) : null}
              {t.counter(current + 1, albums.length)}
            </p>
            <form method="dialog">
              <button
                aria-label={t.closePhoto}
                className="grid size-10 place-items-center rounded-full bg-white/10 text-2xl leading-none transition hover:bg-white/20"
              >
                ×
              </button>
            </form>
          </div>

          <div className="relative min-h-0 flex-1">
            <Photo
              key={photo.id}
              source={photo.source}
              alt={photo.alt}
              sizes="96vw"
              className="object-contain"
            />
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label={t.previousPhoto}
              className="absolute start-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-2xl transition hover:bg-black/65 sm:start-3"
            >
              <span aria-hidden className="rtl:-scale-x-100">‹</span>
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label={t.nextPhoto}
              className="absolute end-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-2xl transition hover:bg-black/65 sm:end-3"
            >
              <span aria-hidden className="rtl:-scale-x-100">›</span>
            </button>
          </div>
          <p className="px-1 pt-3 text-center text-sm text-white/75">{photo.alt}</p>
        </div>
      </dialog>
    </>
  );
}
