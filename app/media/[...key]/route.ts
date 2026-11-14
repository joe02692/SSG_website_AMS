import { getObjectBytes } from "@/lib/b2";
import { isPublicImageKey } from "@/lib/public-images";

/**
 * Serves the public photos (event photos, leaders' profile pictures) from
 * the private B2 bucket. Only keys under "Public/Leaders/" and
 * "Public/Events/" that look exactly like ones we created are served —
 * nothing else in the bucket can be reached through here.
 *
 * Each upload gets a new random name, so a file never changes once stored:
 * browsers and Vercel's CDN may keep it for a year.
 */
export async function GET(_request: Request, ctx: RouteContext<"/media/[...key]">) {
  const { key: parts } = await ctx.params;
  const key = parts.join("/");
  if (!isPublicImageKey(key)) return new Response("Not found", { status: 404 });

  let bytes: Uint8Array | null = null;
  try {
    bytes = await getObjectBytes(key);
  } catch (error) {
    console.error("[media] could not read", key, error);
    return new Response("Unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!bytes) return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=60" } });

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": "inline",
    },
  });
}
