/**
 * Shrinks a photo in the browser before uploading it.
 *
 * A phone camera produces a ~4000px, 3MB image. A birth certificate needs
 * nowhere near that — 1600px across is sharper than a printed photocopy and
 * lands around 400–600KB. That is the difference between 400 scouts costing
 * ~1.2GB and costing ~200MB, and it makes uploads far faster on a phone
 * connection.
 *
 * Runs entirely in the browser: no upload happens until this is done, so the
 * full-size original never leaves the device.
 *
 * PDFs pass through untouched — they're already small and canvas can't read
 * them.
 */

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  // Small images aren't worth re-encoding; doing so can even make them bigger.
  if (file.size < 400 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);

    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );

    // Already small enough in both dimensions — leave it alone.
    if (scale === 1 && file.size < 1024 * 1024) {
      bitmap.close();
      return file;
    }

    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );

    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    // Any failure (unsupported format, memory, an old browser) just means we
    // upload the original — never block the member from registering.
    return file;
  }
}
