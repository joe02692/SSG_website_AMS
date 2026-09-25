import type { Metadata } from "next";
import { SiteShell } from "@/components/site-shell";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { GALLERY } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Camp Gallery",
  description: "Photos from El-Salam Scouting Group camps, hikes and events.",
};

/**
 * The design's Camp Gallery: a grid of photo cards, each opening a
 * full-screen viewer.
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
      <section className="bg-surface">
        <div className="mx-auto w-[calc(100%-40px)] max-w-[1100px] pb-10 pt-10">
          <p className="font-display text-lg text-brand-ink">
            <span lang="ar" dir="rtl">معرض الصور</span>
          </p>
          <h1 className="mt-1 text-[clamp(30px,6vw,44px)] leading-tight text-maroon">
            Camp Gallery
          </h1>
          <p className="mt-2 max-w-2xl text-[clamp(20px,4.2vw,26px)] font-medium leading-snug text-forest">
            Every camp, hike and event — one album at a time.
          </p>
        </div>
      </section>
      <section className="mx-auto w-[calc(100%-40px)] max-w-[1100px] pb-16">
        <GalleryGrid albums={GALLERY} />
      </section>
    </SiteShell>
  );
}
