"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Album } from "@/lib/site-content";
import { LIGHT_DISMISS, lightDismissFallback } from "@/components/ui/dialog-utils";

/**
 * Photo cards that open a full-screen viewer.
 *
 * The viewer is a native modal <dialog>: focus moves into it and back to the
 * card you clicked, Escape and a tap on the dark backdrop close it, and the
 * page behind is inert. ← / → step through the photos.
 */
export function GalleryGrid({ albums }: { albums: Album[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [current, setCurrent] = useState(0);

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
          <li key={album.name} className="reveal">
            <button
              type="button"
              onClick={() => open(i)}
              aria-label={`${album.name} — open photo`}
              className="group relative block aspect-4/3 w-full overflow-hidden rounded-xl bg-forest text-left"
            >
              <Image
                src={album.src}
                alt={album.alt}
                fill
                placeholder="blur"
                priority={i < 3}
                sizes="(min-width: 1024px) 340px, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
              <span
                aria-hidden
                className="absolute inset-0 bg-linear-to-t from-forest/90 via-forest/35 via-40% to-forest/5"
              />
              <span className="absolute inset-x-3.5 bottom-3 z-10 flex items-end justify-between gap-2">
                <span className="text-[clamp(16px,4vw,20px)] font-semibold tracking-[0.04em] text-white">
                  {album.name}
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
        aria-label={`${photo.name}, photo ${current + 1} of ${albums.length}`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
        className="lightbox on-dark m-auto h-[min(92dvh,900px)] max-h-none w-[min(96vw,1200px)] max-w-none bg-transparent p-0 text-white"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 px-1 pb-3">
            <p className="text-sm text-white/80">
              <span className="font-semibold text-white">{photo.name}</span>
              <span className="mx-2" aria-hidden>·</span>
              {current + 1} / {albums.length}
            </p>
            <form method="dialog">
              <button
                aria-label="Close photo"
                className="grid size-10 place-items-center rounded-full bg-white/10 text-2xl leading-none transition hover:bg-white/20"
              >
                ×
              </button>
            </form>
          </div>

          <div className="relative min-h-0 flex-1">
            <Image
              key={photo.name}
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="96vw"
              placeholder="blur"
              className="object-contain"
            />
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous photo"
              className="absolute left-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-2xl transition hover:bg-black/65 sm:left-3"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next photo"
              className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-2xl transition hover:bg-black/65 sm:right-3"
            >
              ›
            </button>
          </div>
          <p className="px-1 pt-3 text-center text-sm text-white/75">{photo.alt}</p>
        </div>
      </dialog>
    </>
  );
}
