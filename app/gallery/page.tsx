import type { Metadata } from "next";
import Image from "next/image";
import { SiteShell } from "@/components/site-shell";
import { GALLERY } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Camp Gallery",
  description:
    "Photos from El-Salam Scouting Group camps, hikes and events.",
};

/**
 * The design's Camp Gallery: a grid of photo cards, fixed for now.
 *
 * These are the eight photos the design shipped with, served from /public.
 * The Cloudinary connection this page used to read albums from is still in
 * the codebase — lib/cloudinary.ts and /gallery/[album] — so switching back
 * to live albums later means changing where GALLERY comes from, not
 * rebuilding the integration.
 */
export default function GalleryPage() {
  return (
    <SiteShell>
      <section className="mx-auto w-[calc(100%-40px)] max-w-[1000px] pb-14 pt-7">
        <h1 className="text-[clamp(28px,6vw,36px)] leading-tight text-maroon">
          Camp Gallery
        </h1>
        <p className="mt-2.5 text-[clamp(20px,4.2vw,26px)] font-medium leading-snug text-forest">
          Every camp, hike and event — one album at a time.
        </p>

        <ul className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {GALLERY.map((album, i) => (
            <li key={album.name}>
              <figure className="relative aspect-4/3 overflow-hidden rounded-md bg-forest">
                <Image
                  src={album.src}
                  alt={album.alt}
                  fill
                  placeholder="blur"
                  priority={i < 2}
                  sizes="(min-width: 640px) 490px, 100vw"
                  className="object-cover"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-linear-to-t from-forest/90 via-forest/40 via-40% to-forest/15"
                />
                <figcaption className="absolute inset-x-3.5 bottom-3 z-10 text-[clamp(16px,4vw,20px)] font-semibold tracking-[0.04em] text-white">
                  {album.name}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </section>
    </SiteShell>
  );
}
