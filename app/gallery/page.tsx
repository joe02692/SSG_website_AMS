import type { Metadata } from "next";
import { SiteShell } from "@/components/site-shell";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { PageBanner } from "@/components/page-banner";
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
      <PageBanner title="Camp Gallery" arabic="معرض الصور">
        Every camp, hike and event — one album at a time. Tap a photo to see
        it full size.
      </PageBanner>
      <section className="mx-auto w-[calc(100%-40px)] max-w-[1100px] pb-16">
        <GalleryGrid albums={GALLERY} />
      </section>
    </SiteShell>
  );
}
