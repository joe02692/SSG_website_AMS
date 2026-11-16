import "server-only";

import sharp from "sharp";
import { deleteAllVersions, putObject } from "@/lib/b2";

/**
 * Photos that anyone may see: event photos and leaders' profile pictures
 * (migration 0028). They live in the private B2 bucket under "Public/…" and
 * are served by app/media/[...key]/route.ts, which only ever serves that
 * folder.
 *
 * Every upload is decoded and re-encoded here with sharp: the stored file is
 * a fresh WebP we made, so a file that only pretends to be a photo is
 * refused, and the camera's hidden details (GPS location, device) are gone.
 */

export const PUBLIC_IMAGE_FOLDERS = {
  leaders: "Public/Leaders/",
  events: "Public/Events/",
} as const;

export type PublicImageFolder = keyof typeof PUBLIC_IMAGE_FOLDERS;

/** What the browser may send (it shrinks big photos first; lib/compress-image.ts). */
export const MAX_IMAGE_UPLOAD_BYTES = 2.5 * 1024 * 1024;

const SIZES: Record<PublicImageFolder, { width: number; height: number; fit: "cover" | "inside" }> = {
  // Square profile picture.
  leaders: { width: 640, height: 640, fit: "cover" },
  // Event photos keep their shape, up to 1600 px wide.
  events: { width: 1600, height: 1600, fit: "inside" },
};

export function isPublicImageKey(key: unknown, folder?: PublicImageFolder): key is string {
  if (typeof key !== "string" || !/^Public\/(Leaders|Events)\/[0-9a-f-]{36}\.webp$/.test(key)) return false;
  return folder ? key.startsWith(PUBLIC_IMAGE_FOLDERS[folder]) : true;
}

export type StoreResult = { key: string } | { error: "too-big" | "not-image" | "storage" };

export async function storePublicImage(file: File, folder: PublicImageFolder): Promise<StoreResult> {
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) return { error: "too-big" };
  let output: Buffer;
  try {
    const size = SIZES[folder];
    output = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 50_000_000 })
      .rotate() // honour the phone's orientation before the details are dropped
      .resize({ width: size.width, height: size.height, fit: size.fit, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return { error: "not-image" };
  }
  const key = `${PUBLIC_IMAGE_FOLDERS[folder]}${crypto.randomUUID()}.webp`;
  try {
    await putObject(key, new Uint8Array(output), "image/webp");
  } catch (error) {
    console.error("[images] could not store", error);
    return { error: "storage" };
  }
  return { key };
}

/** Removes a photo for good (all versions). Never throws. */
export async function deletePublicImage(key: string | null | undefined): Promise<void> {
  if (!isPublicImageKey(key)) return;
  try {
    await deleteAllVersions(key, undefined, true);
  } catch (error) {
    console.error("[images] could not delete", key, error);
  }
}

/** The address a page uses to show a stored photo. */
export function publicImageUrl(key: string | null | undefined): string | null {
  return isPublicImageKey(key) ? `/media/${key}` : null;
}
