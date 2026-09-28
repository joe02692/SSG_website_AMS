import "server-only";

import { cache } from "react";

/**
 * Read-only Cloudinary integration.
 *
 * The convention: every album is a folder inside the `gallery/` folder in
 * the Cloudinary Media Library. Drag photos into `gallery/summer-camp-2026`
 * in the console and the site picks them up — no upload UI, no extra tables.
 *
 * Uses the Admin API over plain fetch (no SDK dependency) with the
 * API key/secret, which must NEVER be exposed to the browser — hence
 * the "server-only" import above. Results are cached by Next's data cache
 * for an hour, keeping us far away from the free tier's rate limits.
 */

/** The Cloudinary folder albums live in. Same setting the upload script
 *  reads, so they can't disagree. A nested path ("ssg/gallery") works too. */
const ROOT_FOLDER = (process.env.CLOUDINARY_GALLERY_FOLDER || "gallery")
  .replace(/^\/+|\/+$/g, "")
  .toLowerCase();
const REVALIDATE_SECONDS = 3600;

export type GalleryPhoto = {
  publicId: string;
  /** Human caption: context caption if set, else prettified file name. */
  caption: string;
  width: number;
  height: number;
  createdAt: string;
  /** Album names as written by scripts/upload-gallery.mjs, if present. */
  album?: string;
  albumAr?: string;
};

export type GalleryAlbum = {
  /** Folder path, e.g. "gallery/summer-camp-2026" */
  path: string;
  /** URL-safe segment, e.g. "summer-camp-2026" */
  slug: string;
  /** Display name, e.g. "Summer Camp 2026" */
  name: string;
  /** Arabic name, when the album came from an Arabic-named folder. */
  nameAr?: string;
  photoCount: number;
  cover: GalleryPhoto | null;
};

function credentials() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

/** True when Cloudinary env vars are configured. */
export function cloudinaryConfigured(): boolean {
  return credentials() !== null;
}

async function adminGet(path: string): Promise<unknown | null> {
  const creds = credentials();
  if (!creds) return null;

  const url = `https://api.cloudinary.com/v1_1/${creds.cloudName}${path}`;
  const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString(
    "base64",
  );

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
      next: { revalidate: REVALIDATE_SECONDS, tags: ["gallery"] },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    // Network failure or bad credentials — the site degrades to placeholders
    // rather than crashing the page.
    return null;
  }
}

/** Same as adminGet, for the search endpoint, which takes a JSON body. */
async function adminPost(path: string, body: unknown): Promise<unknown | null> {
  const creds = credentials();
  if (!creds) return null;

  const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString(
    "base64",
  );

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${creds.cloudName}${path}`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        next: { revalidate: REVALIDATE_SECONDS, tags: ["gallery"] },
      },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Find the real root folder path, case-insensitively — so "gallery",
 * "Gallery" or "GALLERY" in the Media Library all work.
 *
 * cache()d because every album lookup starts by calling this. Rendering the
 * gallery for M albums used to issue the /folders request M+1 times, each one
 * a sequential await blocking that album's photo fetch.
 */
const resolveRootFolder = cache(async (): Promise<string | null> => {
  // A nested path can't be found in the top-level listing; trust it as given.
  if (ROOT_FOLDER.includes("/")) return process.env.CLOUDINARY_GALLERY_FOLDER!.replace(/^\/+|\/+$/g, "");
  const data = (await adminGet(`/folders`)) as {
    folders?: { name: string; path: string }[];
  } | null;
  if (!data?.folders?.length) return null;
  const match = data.folders.find(
    (folder) => folder.name.toLowerCase() === ROOT_FOLDER,
  );
  return match?.path ?? null;
});

function titleCase(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

type RawResource = {
  public_id: string;
  width?: number;
  height?: number;
  created_at?: string;
  display_name?: string;
  context?: { custom?: Record<string, string> } | Record<string, string>;
};

function toPhoto(raw: RawResource): GalleryPhoto {
  const custom =
    raw.context && "custom" in raw.context
      ? ((raw.context as { custom?: Record<string, string> }).custom ?? {})
      : ((raw.context as Record<string, string> | undefined) ?? {});

  const fileName =
    raw.display_name ?? raw.public_id.split("/").pop() ?? raw.public_id;

  return {
    publicId: raw.public_id,
    caption: custom.caption || custom.alt || titleCase(fileName),
    width: raw.width ?? 4,
    height: raw.height ?? 3,
    createdAt: raw.created_at ?? "",
    album: custom.album || undefined,
    albumAr: custom.album_ar || undefined,
  };
}

function newestFirst(a: GalleryPhoto, b: GalleryPhoto): number {
  return b.createdAt.localeCompare(a.createdAt);
}

/**
 * Album order inside an album: by file name, which for camera photos
 * (IMG_0412, IMG_0413 …) is the order they were taken. Upload time is
 * meaningless here — the script uploads three at a time, so it's shuffled.
 */
const byFileName = new Intl.Collator("en", { numeric: true }).compare;
function inShootingOrder(a: GalleryPhoto, b: GalleryPhoto): number {
  return byFileName(a.publicId, b.publicId);
}

/** The most recent 4-digit year in an album's name, or 0. */
function yearOf(name: string): number {
  const years = name.match(/\b(19|20)\d{2}\b/g);
  return years ? Math.max(...years.map(Number)) : 0;
}

/** Within one year the summer camp came after the winter one. */
function seasonOf(name: string): number {
  return /summer/i.test(name) ? 2 : /winter/i.test(name) ? 1 : 0;
}

/**
 * Photos inside one album folder, newest first.
 *
 * Tries the dynamic-folders endpoint first (the default for new Cloudinary
 * accounts), then falls back to the fixed-folders prefix listing, so the
 * same code works whichever mode the account is in.
 */
export async function getAlbumPhotos(slug: string): Promise<GalleryPhoto[]> {
  const root = await resolveRootFolder();
  if (!root) return [];
  const folder = `${root}/${slug}`;

  // Dynamic folder mode
  const dynamic = (await adminGet(
    `/resources/by_asset_folder?asset_folder=${encodeURIComponent(folder)}&max_results=200&context=true`,
  )) as { resources?: RawResource[] } | null;
  if (dynamic?.resources?.length) {
    return dynamic.resources.map(toPhoto).sort(inShootingOrder);
  }

  // Fixed folder mode
  const fixed = (await adminGet(
    `/resources/image/upload?prefix=${encodeURIComponent(`${folder}/`)}&max_results=200&context=true`,
  )) as { resources?: RawResource[] } | null;
  if (fixed?.resources?.length) {
    return fixed.resources.map(toPhoto).sort(inShootingOrder);
  }

  return [];
}

/** All albums (subfolders of `gallery/`), newest cover photo first. */
export async function getAlbums(): Promise<GalleryAlbum[]> {
  const root = await resolveRootFolder();
  if (!root) return [];

  const data = (await adminGet(`/folders/${encodeURIComponent(root)}`)) as {
    folders?: { name: string; path: string }[];
  } | null;

  if (!data?.folders?.length) return [];

  const albums = await Promise.all(
    data.folders.map(async (folder): Promise<GalleryAlbum> => {
      const photos = await getAlbumPhotos(folder.name);
      return {
        path: folder.path,
        slug: folder.name,
        // The upload script records the name as typed ("Summer Camp 2026");
        // an album made by hand in the console falls back to its folder name.
        name: photos[0]?.album ?? titleCase(folder.name),
        nameAr: photos[0]?.albumAr,
        photoCount: photos.length,
        cover: photos[0] ?? null,
      };
    }),
  );

  // Newest event first: "Summer Camp 2018" before "Summer Camp 2016". The
  // year in the name is the event's year; upload dates are all the same day.
  // Albums without a year follow, newest upload first.
  return albums
    .filter((album) => album.photoCount > 0)
    .sort(
      (a, b) =>
        yearOf(b.name) - yearOf(a.name) ||
        seasonOf(b.name) - seasonOf(a.name) ||
        (b.cover?.createdAt ?? "").localeCompare(a.cover?.createdAt ?? ""),
    );
}

/**
 * The newest photos across every album — used on the landing page.
 *
 * One request, not 2 + 2M.
 *
 * This used to call getAlbums() (which itself fetches every photo of every
 * album, purely to count them and pick a cover) and then fetch every photo of
 * every album a second time, downloading up to 200 resource records per album
 * in order to display six. Cloudinary's search endpoint does the sorting and
 * the limiting server-side, which is what it is for.
 *
 * Falls back to the old walk if search is unavailable — it is not offered on
 * every Cloudinary plan, and a landing page losing its gallery strip is a
 * worse outcome than an inefficient one.
 */
export async function getLatestPhotos(limit: number): Promise<
  (GalleryPhoto & { albumName: string; albumSlug: string })[]
> {
  const root = await resolveRootFolder();
  if (!root) return [];

  const searched = (await adminPost("/resources/search", {
    expression: `folder="${root}/*" AND resource_type:image`,
    sort_by: [{ created_at: "desc" }],
    max_results: limit,
    with_field: ["context"],
  })) as { resources?: (RawResource & { asset_folder?: string })[] } | null;

  if (searched?.resources?.length) {
    return searched.resources.map((raw) => {
      // The album is the last path segment of the folder the asset lives in.
      const folder =
        raw.asset_folder ?? raw.public_id.split("/").slice(0, -1).join("/");
      const slug = folder.split("/").pop() ?? "";
      return {
        ...toPhoto(raw),
        albumName: titleCase(slug),
        albumSlug: slug,
      };
    });
  }

  // Fallback: the original walk. Still correct, just chattier.
  const albums = await getAlbums();
  const tagged = albums.flatMap((album) =>
    album.cover
      ? [{ ...album.cover, albumName: album.name, albumSlug: album.slug }]
      : [],
  );
  return tagged.sort(newestFirst).slice(0, limit);
}

/** Delivery URL with automatic format/quality and smart-cropped width. */
export function photoUrl(publicId: string, width: number): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,c_fill,g_auto,w_${width},h_${Math.round((width * 3) / 4)}/${publicId}`;
}

/** Delivery URL preserving the original aspect ratio (album detail view). */
export function photoUrlFit(publicId: string, width: number): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,c_limit,w_${width}/${publicId}`;
}
