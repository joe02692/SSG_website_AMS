#!/usr/bin/env node
/**
 * Upload a folder of event photos to Cloudinary, one album per subfolder.
 *
 *   node scripts/upload-gallery.mjs "C:\Users\you\Downloads\photos"
 *
 * Layout it expects — exactly what "Download" on a Google Drive folder gives
 * you once it's unzipped:
 *
 *   photos/
 *     Summer Camp 2026/      → album  gallery/summer-camp-2026
 *       IMG_0001.jpg
 *     رحلة الإسكندرية/        → asks you for an English name, e.g. "Alexandria Trip"
 *       ...
 *
 * Photos sitting directly in the top folder (not in a subfolder) are SKIPPED
 * by default: in the group's Drive those are the homepage slideshow picks,
 * which live in the site itself, not in the gallery. Add --include-loose to
 * upload them as one more album (you'll be asked for its name).
 *
 * The albums go under a Cloudinary folder called "gallery", or whatever
 * CLOUDINARY_GALLERY_FOLDER in .env.local says. The website reads the same
 * setting, so the two always agree.
 *
 * What it does to each photo before upload, and why:
 *   • turns it the right way up (phones store rotation as a tag, not pixels)
 *   • shrinks it to at most 2400px on the long side — plenty for a full-screen
 *     viewer, and it keeps every file under Cloudinary's 10 MB free-plan limit
 *   • strips EXIF metadata, which on a phone photo includes the GPS position
 *     it was taken at. These are photos of children; their location does not
 *     go on the internet.
 * That needs `sharp`, which Next.js already installs. If it's missing, the
 * photo is uploaded as-is and Cloudinary does the resize and strip on arrival
 * instead (an "incoming transformation") — same result, but a file over
 * 10 MB will be refused.
 *
 * Safe to run twice: each photo gets a fixed id from its album and file name,
 * and an existing one is skipped, not duplicated.
 *
 * Reads NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and
 * CLOUDINARY_API_SECRET from .env.local. The keys never leave your computer
 * except to go to Cloudinary, and they are never printed.
 */

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";

const MAX_SIDE = 2400;
const MAX_BYTES = 10 * 1024 * 1024;
const PARALLEL = 3;
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".avif"]);

// ---------------------------------------------------------------- env ------
function loadEnv() {
  const file = resolve(process.cwd(), ".env.local");
  const env = { ...process.env };
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!m || line.trim().startsWith("#")) continue;
      // .env.local wins over anything already in the environment: it is the
      // file you edit, so a stale system variable must not silently override it.
      env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  }
  return env;
}

// ------------------------------------------------------------- naming ------
/** "Summer Camp 2026" → "summer-camp-2026". ASCII only: the album name ends up
 *  in the page URL, and /gallery/[album] only accepts plain letters, digits,
 *  spaces and hyphens. */
export function slugify(name) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const hasArabic = (s) => /[\u0600-\u06FF]/.test(s);

/** Arabic-Indic digits (٢٠١٨) to Western (2018). */
const westernDigits = (s) => s.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));

/** Places that appear in the group's camp folder names. Anything missing
 *  here is simply asked for when the script runs. */
const PLACES = {
  "الأقصر و أسوان": "Luxor & Aswan",
  "الأقصر وأسوان": "Luxor & Aswan",
  "مرسى علم": "Marsa Alam",
  "الواحات": "The Oases",
  "جنوب سيناء": "South Sinai",
  "سيناء": "Sinai",
  "بورسعيد": "Port Said",
  "مرسى مطروح": "Marsa Matrouh",
  "سيوة": "Siwa",
  "الغردقة": "Hurghada",
};

/**
 * "٢٠١٨ صيفي (مرسى علم )" → "Summer Camp 2018 — Marsa Alam".
 * The group names every camp folder as year + season + (place), so those need
 * no typing. Returns null for anything else, which is then asked for.
 */
export function campName(folder) {
  const text = westernDigits(folder).replace(/\s+/g, " ").trim();
  const year = text.match(/\b(19|20)\d{2}\b/)?.[0];
  const season = /صيفي/.test(text) ? "Summer" : /شتوي/.test(text) ? "Winter" : null;
  const place = text.match(/\(([^)]*)\)/)?.[1]?.trim();
  if (!year || !season) return null;
  const english = place ? PLACES[place] : undefined;
  if (place && !english) return null;
  return `${season} Camp ${year}${english ? ` — ${english}` : ""}`;
}

// ----------------------------------------------------------- cloudinary ----
/**
 * Cloudinary's signature: a hash of the sorted params plus the secret.
 *
 * A literal "&" inside a value is written as "%26" — Cloudinary does this on
 * its side (its error for "Luxor & Aswan" showed "Luxor %26 Aswan"), because
 * otherwise the & would read as a separator between two params.
 *
 * SHA-1 unless the account is set to SHA-256; the uploader finds out which on
 * its first try and sticks with it.
 */
export function sign(params, secret, algorithm = "sha1") {
  const toSign = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== "")
    .sort()
    .map((k) => `${k}=${String(params[k]).replace(/&/g, "%26")}`)
    .join("&");
  return createHash(algorithm).update(toSign + secret).digest("hex");
}

const basicAuth = ({ key, secret }) =>
  `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`;

/**
 * Checks the key and secret before touching any photo. The Admin API's ping
 * uses plain key:secret authentication, no signature — so if this fails, the
 * credentials themselves are wrong, and there's no point preparing 100 photos
 * only to have each one refused.
 */
async function checkCredentials(creds) {
  const res = await fetch(`${creds.apiBase}/v1_1/${creds.cloud}/ping`, {
    headers: { Authorization: basicAuth(creds) },
  }).catch((e) => ({ ok: false, status: 0, _err: e }));
  if (res.ok) return;
  if (res.status === 401) {
    throw new Error(
      "Cloudinary rejected the API key/secret in .env.local.\n" +
        "  Open Cloudinary → Settings → API Keys, and copy the key and secret again into\n" +
        "  CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET (no quotes, no spaces). The secret\n" +
        "  is hidden until you click the eye icon — make sure you copied the secret, not the key.",
    );
  }
  if (res.status === 404) {
    throw new Error(
      `Cloudinary has no cloud called "${creds.cloud}". Check NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME\n` +
        "  in .env.local — it's the Cloud name shown at the top of the Cloudinary dashboard.",
    );
  }
  throw new Error(`Couldn't reach Cloudinary (${res.status || res._err?.message}). Check your internet connection.`);
}

/**
 * Writes the album names onto a photo after it's uploaded.
 *
 * Deliberately NOT part of the signed upload: the names hold Arabic, an em
 * dash and "&", and every one of those is a chance for our signature and
 * Cloudinary's to disagree about the exact bytes. This call uses key:secret
 * authentication instead, where the text can be anything.
 */
async function setContext(creds, publicId, context) {
  const res = await fetch(
    `${creds.apiBase}/v1_1/${creds.cloud}/resources/image/upload/${publicId}`,
    {
      method: "POST",
      headers: { Authorization: basicAuth(creds), "Content-Type": "application/json" },
      body: JSON.stringify({ context }),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
  }
}

/** Shared across uploads: switches to sha256 if the account turns out to use it. */
const signing = { algorithm: "sha1", confirmed: false };

async function upload(creds, file, bytes, params) {
  const { cloud, key, secret, apiBase } = creds;
  const attempt = async (algorithm) => {
    const signed = { ...params, timestamp: Math.floor(Date.now() / 1000) };
    const form = new FormData();
    for (const [k, v] of Object.entries(signed)) form.append(k, String(v));
    form.append("api_key", key);
    form.append("signature", sign(signed, secret, algorithm));
    form.append("file", new Blob([bytes]), basename(file));
    const res = await fetch(`${apiBase}/v1_1/${cloud}/image/upload`, { method: "POST", body: form });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, body, status: res.status };
  };

  let r = await attempt(signing.algorithm);
  // Until one upload has gone through, a bad signature might just mean the
  // account signs with SHA-256 — try that once before giving up.
  if (!r.ok && !signing.confirmed && /Invalid Signature/i.test(r.body?.error?.message ?? "")) {
    const other = signing.algorithm === "sha1" ? "sha256" : "sha1";
    const retry = await attempt(other);
    if (retry.ok) signing.algorithm = other;
    r = retry;
  }
  if (!r.ok) throw new Error(r.body?.error?.message ?? `HTTP ${r.status}`);
  signing.confirmed = true;
  return r.body;
}

// ------------------------------------------------------------- images ------
async function loadSharp() {
  try {
    return (await import("sharp")).default;
  } catch {
    return null;
  }
}

/** Resize, rotate and strip metadata. Returns null if sharp can't read it
 *  (HEIC, mostly) so the caller can fall back to a raw upload. */
async function prepare(sharp, file) {
  if (!sharp) return null;
  try {
    return await sharp(file)
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 84, mozjpeg: true })
      .toBuffer();
  } catch {
    return null;
  }
}

// --------------------------------------------------------------- main ------
async function main() {
  const args = process.argv.slice(2);
  const includeLoose = args.includes("--include-loose");
  const source = args.find((a) => !a.startsWith("--"));
  if (!source || !existsSync(source) || !statSync(source).isDirectory()) {
    console.error('Usage: node scripts/upload-gallery.mjs "<folder of photos>" [--include-loose]');
    process.exit(1);
  }

  const env = loadEnv();
  const creds = {
    cloud: env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    key: env.CLOUDINARY_API_KEY,
    secret: env.CLOUDINARY_API_SECRET,
    // Overridable only so the script can be tested against a fake server.
    apiBase: env.CLOUDINARY_API_BASE || "https://api.cloudinary.com",
  };
  const ROOT = (env.CLOUDINARY_GALLERY_FOLDER || "gallery").replace(/^\/+|\/+$/g, "");
  const missing = ["NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]
    .filter((n) => !env[n]);
  if (missing.length) {
    console.error(`Missing in .env.local: ${missing.join(", ")}. Run this from the project folder.`);
    process.exit(1);
  }

  // Albums: each subfolder, plus any loose photos in the top folder.
  const isImage = (f) => IMAGE_EXT.has(extname(f).toLowerCase());
  const albums = [];
  const loose = readdirSync(source).filter((f) => isImage(f) && statSync(join(source, f)).isFile());
  // Any folder below the top one that holds photos is an album, however
  // deep it sits — the group's Drive keeps the camps one level down, inside
  // "معسكرات (٢٠١٨ إلى ٢٠٢٦)". Empty folders (a camp nobody has added photos
  // to yet) are simply skipped.
  const walk = (dir) => {
    for (const entry of readdirSync(dir).sort()) {
      const path = join(dir, entry);
      if (!statSync(path).isDirectory()) continue;
      const photos = readdirSync(path)
        .filter((f) => isImage(f) && statSync(join(path, f)).isFile())
        .sort()
        .map((f) => join(path, f));
      if (photos.length) albums.push({ folderName: entry, photos });
      walk(path);
    }
  };
  walk(source);
  if (loose.length && !includeLoose) {
    console.log(
      `Skipping ${loose.length} photo(s) in the top folder — those are for the homepage slideshow.\n` +
        "(Add --include-loose to upload them to the gallery as well.)",
    );
  }
  if (loose.length && includeLoose) {
    albums.push({ folderName: basename(resolve(source)), photos: loose.sort().map((f) => join(source, f)), loose: true });
  }
  if (!albums.length) {
    console.error(
      loose.length
        ? "No subfolders with photos found — each event needs its own folder."
        : "No photos found (looked for .jpg .jpeg .png .webp .heic .avif).",
    );
    process.exit(1);
  }

  // Names. Anything that doesn't produce a usable English slug gets asked.
  // Lines are read through the async iterator rather than rl.question():
  // question() drops answers that arrive before it is asked, which breaks the
  // script whenever input is piped in instead of typed.
  const rl = createInterface({ input: stdin, output: stdout, terminal: false });
  const lines = rl[Symbol.asyncIterator]();
  const ask = async (prompt) => {
    stdout.write(prompt);
    const next = await lines.next();
    if (next.done) throw new Error("\nNo answer given — run it again and type the album name.");
    return next.value;
  };
  for (const album of albums) {
    let english = campName(album.folderName) ?? album.folderName;
    if (album.loose || hasArabic(english) || !slugify(english)) {
      const why = album.loose
        ? `${album.photos.length} photos are loose in the top folder`
        : `Album "${album.folderName}" (${album.photos.length} photos)`;
      for (;;) {
        english = (await ask(`${why}.\n  English name for this album (e.g. Summer Camp 2026): `)).trim();
        if (slugify(english)) break;
        console.log("  Please use English letters or numbers.");
      }
    }
    album.name = english;
    album.slug = slugify(english);
    // Tidied for display: "٢٠١٨ صيفي (مرسى علم )" → "٢٠١٨ صيفي (مرسى علم)".
    album.arabic = hasArabic(album.folderName)
      ? album.folderName.replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").replace(/\s+/g, " ").trim()
      : "";
  }
  rl.close();

  try {
    await checkCredentials(creds);
  } catch (err) {
    console.error(`\n${err.message}`);
    process.exit(1);
  }

  const sharp = await loadSharp();
  console.log(
    `\n${albums.reduce((n, a) => n + a.photos.length, 0)} photos in ${albums.length} album(s).` +
      (sharp ? " Resizing and removing location data before upload." : " sharp not found — Cloudinary will resize on arrival."),
  );

  let done = 0, skipped = 0, failed = 0;
  for (const album of albums) {
    console.log(`\n▸ ${album.name}  →  ${ROOT}/${album.slug}`);
    const queue = album.photos.map((file, i) => ({ file, i }));
    const worker = async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        const { file, i } = job;
        const id = slugify(basename(file, extname(file))) || `photo-${i + 1}`;
        try {
          const prepared = await prepare(sharp, file);
          const bytes = prepared ?? readFileSync(file);
          if (bytes.length > MAX_BYTES) {
            throw new Error(`${(bytes.length / 1e6).toFixed(1)} MB is over the 10 MB limit — export it smaller and re-run`);
          }
          // Cloudinary context is "key=value|key=value"; a literal = or |
          // inside a value has to be backslash-escaped.
          const esc = (v) => String(v).replace(/([=|])/g, "\\$1");
          const context = [`alt=${esc(`Photo ${i + 1} from ${album.name}`)}`, `album=${esc(album.name)}`];
          if (album.arabic) context.push(`album_ar=${esc(album.arabic)}`);
          const publicId = `${ROOT}/${album.slug}/${id}`;
          // Everything signed here is plain ASCII on purpose — see setContext.
          const result = await upload(creds, file, bytes, {
            // Both forms, so it lands in the right folder whichever folder
            // mode the Cloudinary account uses (dynamic: asset_folder;
            // fixed: the path in public_id).
            public_id: publicId,
            asset_folder: `${ROOT}/${album.slug}`,
            overwrite: "false",
            // Only matters when sharp couldn't prepare the file: Cloudinary
            // then shrinks and re-encodes it on arrival, dropping metadata.
            ...(prepared ? {} : { transformation: `c_limit,w_${MAX_SIDE},h_${MAX_SIDE}`, format: "jpg" }),
          });
          try {
            await setContext(creds, result.public_id ?? publicId, context.join("|"));
          } catch (err) {
            // The photo is safely up; only its caption is missing. Re-running
            // the script fills it in.
            console.log(`  ! ${basename(file)} uploaded, but its album name wasn't saved (${err.message}) — run the script again`);
          }
          if (result.existing) {
            skipped++;
            console.log(`  = ${basename(file)} (already uploaded)`);
          } else {
            done++;
            console.log(`  ✓ ${basename(file)}`);
          }
        } catch (err) {
          failed++;
          console.log(`  ✗ ${basename(file)} — ${err.message}`);
        }
      }
    };
    await Promise.all(Array.from({ length: PARALLEL }, worker));
  }

  console.log(`\nDone: ${done} uploaded, ${skipped} already there, ${failed} failed.`);
  console.log("New albums appear on /gallery within the hour (the site caches the album list).");
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
