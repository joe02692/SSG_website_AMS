"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { LIGHT_DISMISS, lightDismissFallback } from "@/components/ui/dialog-utils";

/**
 * An event's photo that opens full size when clicked (validation feedback,
 * 17 Nov 2026). Fills its (relative) parent, like next/image `fill`.
 *
 * The viewer is the same native modal <dialog> as the gallery's: Escape, the
 * × button or a tap on the dark backdrop close it, and focus returns to the
 * photo.
 */
export function EventPhoto({
  src,
  title,
  sizes,
  priority = false,
  openLabel,
  closeLabel,
}: {
  src: string;
  title: string;
  sizes: string;
  priority?: boolean;
  openLabel: string;
  closeLabel: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    return d ? lightDismissFallback(d) : undefined;
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label={openLabel}
        className="group absolute inset-0 block cursor-zoom-in overflow-hidden"
      >
        <Image
          src={src}
          alt=""
          fill
          unoptimized
          {...(priority ? { preload: true, fetchPriority: "high" as const } : {})}
          sizes={sizes}
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <span
          aria-hidden
          className="absolute bottom-3 end-3 grid size-9 place-items-center rounded-full bg-forest/80 text-sun opacity-0 shadow transition group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 3h5v5M8 17H3v-5M17 3l-6 6M3 17l6-6" />
          </svg>
        </span>
      </button>

      <dialog
        ref={dialog}
        {...LIGHT_DISMISS}
        aria-label={title}
        className="lightbox on-dark m-auto h-[min(92dvh,900px)] max-h-none w-[min(96vw,1200px)] max-w-none bg-transparent p-0 text-white"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 px-1 pb-3">
            <p className="min-w-0 truncate text-sm font-semibold text-white">
              <bdi>{title}</bdi>
            </p>
            <form method="dialog">
              <button
                aria-label={closeLabel}
                className="grid size-10 place-items-center rounded-full bg-white/10 text-2xl leading-none transition hover:bg-white/20"
              >
                ×
              </button>
            </form>
          </div>
          <div className="relative min-h-0 flex-1">
            <Image src={src} alt={title} fill unoptimized sizes="96vw" className="object-contain" />
          </div>
        </div>
      </dialog>
    </>
  );
}
