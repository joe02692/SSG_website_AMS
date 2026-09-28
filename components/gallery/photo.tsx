"use client";

import Image, { type ImageLoaderProps, type StaticImageData } from "next/image";

/**
 * One photo, from either source the site uses:
 *   • a file in /public (imported, so next/image knows its size and blur)
 *   • a Cloudinary asset, by public id
 *
 * Cloudinary photos go through a Cloudinary *loader*, so Cloudinary does the
 * resizing and format choice (f_auto) on its own CDN. Without it, next/image
 * would download each Cloudinary photo to Vercel and resize it a second time
 * — spending the Hobby plan's 5,000 image transformations a month on work
 * Cloudinary had already done, and on overrun new images simply stop loading.
 *
 * This lives in a client component because the loader is a function, and
 * functions can't be passed from a server component to next/image.
 */
export type PhotoSource =
  | { kind: "static"; image: StaticImageData }
  | { kind: "cloudinary"; publicId: string; width: number; height: number };

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

function cloudinaryLoader({ src, width, quality }: ImageLoaderProps) {
  const q = quality ? `q_${quality}` : "q_auto";
  return `https://res.cloudinary.com/${CLOUD}/image/upload/f_auto,${q},c_limit,w_${width}/${src}`;
}

export function Photo({
  source,
  alt,
  sizes,
  className,
  priority,
}: {
  source: PhotoSource;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  if (source.kind === "static") {
    return (
      <Image
        src={source.image}
        alt={alt}
        fill
        placeholder="blur"
        sizes={sizes}
        priority={priority}
        className={className}
      />
    );
  }
  return (
    <Image
      loader={cloudinaryLoader}
      src={source.publicId}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
    />
  );
}
