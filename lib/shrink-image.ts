/**
 * Shrinks a photo in the browser before it is uploaded, so a 6 MB phone
 * picture travels as a few hundred KB (server actions accept up to 3 MB).
 * The server re-encodes it anyway (lib/public-images.ts); this only saves
 * the upload. If the browser can't read the file, the original is sent and
 * the server decides.
 */
export async function shrinkImage(file: File, maxSide: number): Promise<File> {
  if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], "photo.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
