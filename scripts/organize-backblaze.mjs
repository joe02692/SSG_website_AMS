#!/usr/bin/env node
/**
 * Tidies the Backblaze bucket into the layout the website uses (Oct 2026):
 *
 *   Members/Scouts/<Stage>/<Full name> - Birth certificate.jpg
 *   Members/Leaders/Males/<Full name> - ID card.jpg
 *   Members/Leaders/Females/<Full name> - ID card.jpg
 *   Members/Leaders/Gender not set/<Full name> - ID card.jpg
 *   Members/Former members/…        (filled by the website when you delete an account)
 *   Seasonal Plans/…                (left exactly as it is)
 *   _System/Incoming/…              (temporary uploads — left as they are)
 *   _System/Unfiled/<old path>      (anything no member's record points to)
 *
 * Safe to run again at any time; files already in place are skipped.
 *
 * New uploads are filed like this automatically by the website. This script
 * moves the files uploaded BEFORE that change, and updates each member's
 * record to the new place.
 *
 * Nothing is lost: every file is copied first, the record updated, and only
 * then is the old copy removed. (Your bucket also keeps old versions.)
 *
 * Usage, from the project folder:
 *   node scripts/organize-backblaze.mjs           ← dry run: shows what would move
 *   node scripts/organize-backblaze.mjs --apply   ← actually moves the files
 *
 * Wiping test data before launch (PERMANENT — read this first):
 *   node scripts/organize-backblaze.mjs --delete-orphans          ← dry run: lists what would go
 *   node scripts/organize-backblaze.mjs --delete-orphans --apply  ← deletes for good
 *
 *   "Orphans" are files no scout_details / leader_details row points to,
 *   anywhere except Seasonal Plans/ (plans have no database row and are never
 *   touched). That includes Members/Former members/, _System/Unfiled/ and
 *   _System/Incoming/. Every version of each file is deleted, including the
 *   hidden old versions Backblaze keeps, so they cannot be restored.
 *   Add --keep-former-members to leave Members/Former members/ alone.
 *   If the database has no documents at all (wrong project, or a real wipe),
 *   --apply also needs --database-is-empty, so a typo in .env.local can't
 *   delete a whole bucket.
 *
 * Reads from .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * B2_KEY_ID, B2_APP_KEY, B2_BUCKET, B2_ENDPOINT, B2_REGION.
 * Run migrations 0020 and 0021 in Supabase first (0024 is not needed for this).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectVersionsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

const APPLY = process.argv.includes("--apply");
const DELETE_ORPHANS = process.argv.includes("--delete-orphans");
const KEEP_FORMER = process.argv.includes("--keep-former-members");
const DB_IS_EMPTY = process.argv.includes("--database-is-empty");

function loadEnv() {
  const file = resolve(process.cwd(), ".env.local");
  const env = { ...process.env };
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!m || line.trim().startsWith("#")) continue;
      env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  }
  return env;
}

const env = loadEnv();
const needed = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "B2_KEY_ID",
  "B2_APP_KEY",
  "B2_BUCKET",
  "B2_ENDPOINT",
  "B2_REGION",
];
const missing = needed.filter((name) => !env[name]);
if (missing.length) {
  console.error(`Missing in .env.local: ${missing.join(", ")}`);
  process.exit(1);
}

// ---------------------------------------------------------------- naming ---
// Same rules as lib/storage-paths.ts and lib/onboarding.ts in the app.
const STAGE_LABELS = {
  baraem: "Buds",
  zahrat: "Blossoms",
  ashbal: "Cubs",
  morshedat: "Guides",
  kashafa: "Scouts",
  motaqademat: "Senior Guides",
  motaqadem: "Senior Scouts",
  jawala: "Rovers",
};
const scoutFolder = (code) => `Members/Scouts/${STAGE_LABELS[code] ?? "Stage not set"}`;
const leaderFolder = (gender) =>
  gender === "male"
    ? "Members/Leaders/Males"
    : gender === "female"
      ? "Members/Leaders/Females"
      : "Members/Leaders/Gender not set";
const LABELS = { scout: "Birth certificate", leader: "ID card" };
function fileBaseName(fullName) {
  const cleaned = (fullName ?? "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N} .'-]+/gu, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s.]+|[\s.]+$/g, "")
    .slice(0, 80)
    .trim();
  return cleaned || "Unnamed";
}

// ---------------------------------------------------------------- clients --
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const s3 = new S3Client({
  region: env.B2_REGION,
  endpoint: env.B2_ENDPOINT,
  credentials: { accessKeyId: env.B2_KEY_ID, secretAccessKey: env.B2_APP_KEY },
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});
const Bucket = env.B2_BUCKET;

const exists = async (Key) => {
  try {
    await s3.send(new HeadObjectCommand({ Bucket, Key }));
    return true;
  } catch {
    return false;
  }
};
const copy = (from, to) =>
  s3.send(
    new CopyObjectCommand({
      Bucket,
      Key: to,
      CopySource: `${Bucket}/${from.split("/").map(encodeURIComponent).join("/")}`,
    }),
  );
const remove = (Key) => s3.send(new DeleteObjectCommand({ Bucket, Key }));

async function listAll() {
  const keys = [];
  let ContinuationToken;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket, ContinuationToken }));
    for (const o of page.Contents ?? []) keys.push(o.Key);
    ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return keys;
}

// ----------------------------------------------------- --delete-orphans --
async function listAllVersions() {
  /** key → [{ id, size, marker }] — every version and delete marker. */
  const byKey = new Map();
  let KeyMarker;
  let VersionIdMarker;
  do {
    const page = await s3.send(
      new ListObjectVersionsCommand({ Bucket, KeyMarker, VersionIdMarker, MaxKeys: 1000 }),
    );
    for (const v of page.Versions ?? []) {
      if (!byKey.has(v.Key)) byKey.set(v.Key, []);
      byKey.get(v.Key).push({ id: v.VersionId, size: v.Size ?? 0, marker: false, latest: Boolean(v.IsLatest) });
    }
    for (const m of page.DeleteMarkers ?? []) {
      if (!byKey.has(m.Key)) byKey.set(m.Key, []);
      byKey.get(m.Key).push({ id: m.VersionId, size: 0, marker: true, latest: Boolean(m.IsLatest) });
    }
    KeyMarker = page.IsTruncated ? page.NextKeyMarker : undefined;
    VersionIdMarker = page.IsTruncated ? page.NextVersionIdMarker : undefined;
  } while (KeyMarker);
  return byKey;
}

async function deleteOrphans() {
  console.log(
    APPLY
      ? "Deleting orphaned files FOR GOOD (APPLY)…\n"
      : "Dry run — nothing will be deleted. Add --apply to delete these for good.\n",
  );

  // Every key a member's record points to. If either read fails, stop: an
  // empty answer here would make every document look like an orphan.
  const { data: scoutRows, error: e1 } = await supabase
    .from("scout_details")
    .select("document_path")
    .not("document_path", "is", null);
  const { data: leaderRows, error: e2 } = await supabase
    .from("leader_details")
    .select("id_card_path")
    .not("id_card_path", "is", null);
  if (e1 || e2 || !Array.isArray(scoutRows) || !Array.isArray(leaderRows)) {
    console.error("Could not read the members' records, so nothing was checked:", (e1 ?? e2)?.message ?? "no data");
    process.exitCode = 1;
    return;
  }
  const referenced = new Set([
    ...scoutRows.map((r) => r.document_path),
    ...leaderRows.map((r) => r.id_card_path),
  ]);

  const byKey = await listAllVersions();
  const orphans = [...byKey.entries()]
    .filter(([key]) =>
      !referenced.has(key) &&
      !key.startsWith("Seasonal Plans/") &&
      !(KEEP_FORMER && key.startsWith("Members/Former members/")),
    )
    .sort(([a], [b]) => a.localeCompare(b));

  let versions = 0;
  let bytes = 0;
  const byFolder = new Map();
  for (const [key, list] of orphans) {
    versions += list.length;
    bytes += list.reduce((sum, v) => sum + v.size, 0);
    const parts = key.split("/");
    const folder = parts.length > 2 ? parts.slice(0, 2).join("/") : parts.length === 2 ? parts[0] : "(bucket root)";
    byFolder.set(folder, (byFolder.get(folder) ?? 0) + 1);
    // "hidden" = already deleted in the B2 console, only old versions remain.
    const hidden = list.some((v) => v.marker && v.latest) ? " (hidden)" : "";
    console.log(`  ${key}  — ${list.length} version(s)${hidden}`);
  }
  console.log(`\nKept: ${referenced.size} file(s) members' records point to, and everything in Seasonal Plans/.`);
  console.log(`Orphans: ${orphans.length} file(s), ${versions} version(s), ${(bytes / 1024 / 1024).toFixed(2)} MB`);
  for (const [folder, n] of byFolder) console.log(`  ${folder}/ … ${n}`);

  if (!APPLY) {
    if (orphans.length) console.log("\nRun again with --delete-orphans --apply to delete these for good.");
    return;
  }
  if (referenced.size === 0 && orphans.length > 0 && !DB_IS_EMPTY) {
    console.error(
      "\nStopped: the database has no documents at all, so EVERY member file looks like an orphan.\n" +
        "If that's really what you want (wiping all test data), add --database-is-empty.\n" +
        "Otherwise check NEXT_PUBLIC_SUPABASE_URL in .env.local points at the right project.",
    );
    process.exitCode = 1;
    return;
  }

  let deleted = 0;
  let failed = 0;
  const jobs = orphans.flatMap(([Key, list]) => list.map((v) => ({ Key, VersionId: v.id })));
  for (let i = 0; i < jobs.length; i += 8) {
    await Promise.all(
      jobs.slice(i, i + 8).map((job) =>
        s3
          .send(new DeleteObjectCommand({ Bucket, Key: job.Key, VersionId: job.VersionId }))
          .then(() => deleted++)
          .catch((error) => {
            failed++;
            console.log(`  ✗ ${job.Key} (${job.VersionId}): ${error.name ?? error.message}`);
          }),
      ),
    );
  }
  console.log(`\nDone: ${deleted} version(s) deleted for good, ${failed} failed.`);
  if (failed) process.exitCode = 1;
}

async function organize() {
  // --------------------------------------------------------------- the work --
  const claimed = new Set(); // targets already given out in this run

  async function freeTarget(folder, base, tail, current) {
    for (let n = 1; n <= 50; n++) {
      const key = `${folder}/${base}${n === 1 ? "" : ` (${n})`}${tail}`;
      if (key === current) return key;
      if (claimed.has(key)) continue;
      if (!(await exists(key))) return key;
    }
    throw new Error(`no free name for ${folder}/${base}`);
  }

  function alreadyFiled(key, folder, base, tail) {
    const head = `${folder}/${base}`;
    if (!key.startsWith(head) || !key.endsWith(tail)) return false;
    const rest = key.slice(head.length, -tail.length);
    return rest === "" || /^ \(\d+\)$/.test(rest);
  }

  let moved = 0;
  let skipped = 0;
  let problems = 0;

  async function refile({ label, table, column, match, key, folder, fullName, docLabel }) {
    const ext = (key.split(".").pop() ?? "jpg").toLowerCase();
    const base = fileBaseName(fullName);
    const tail = ` - ${docLabel}.${ext}`;
    if (alreadyFiled(key, folder, base, tail)) {
      claimed.add(key);
      skipped++;
      return;
    }
    if (!(await exists(key))) {
      console.log(`  ⚠ ${label}: file missing in Backblaze (${key}) — skipped`);
      problems++;
      return;
    }
    const target = await freeTarget(folder, base, tail, key);
    claimed.add(target);
    console.log(`  ${label}\n      ${key}\n    → ${target}`);
    moved++;
    if (!APPLY) return;

    await copy(key, target);
    const { error } = await supabase.from(table).update({ [column]: target }).eq(match.column, match.value);
    if (error) {
      console.log(`    ✗ could not update the record (${error.message}) — the old file was kept`);
      problems++;
      return;
    }
    await remove(key);
  }

  console.log(APPLY ? "Organising Backblaze (APPLY)…\n" : "Dry run — nothing will change. Add --apply to do it.\n");

  // Since 0025 a child registered by a parent has no login (profile_id NULL):
  // rows are matched by their own id, and the name may be on the row itself.
  let { data: scouts, error: scoutError } = await supabase
    .from("scout_details")
    .select("id, profile_id, full_name, document_path, stages(code), profiles:profile_id(full_name)")
    .not("document_path", "is", null);
  if (scoutError) {
    ({ data: scouts, error: scoutError } = await supabase
      .from("scout_details")
      .select("profile_id, document_path, stages(code), profiles:profile_id(full_name)")
      .not("document_path", "is", null));
  }
  if (scoutError) {
    console.error("Could not read scout_details:", scoutError.message);
    process.exit(1);
  }

  const { data: leaders, error: leaderError } = await supabase
    .from("leader_details")
    .select("profile_id, id_card_path, gender, profiles(full_name)");
  if (leaderError) {
    console.error("Could not read leader_details (have you run 0021?):", leaderError.message);
    process.exit(1);
  }

  console.log(`Scouts (${scouts.length}):`);
  for (const row of scouts) {
    await refile({
      label: `${row.profiles?.full_name ?? row.full_name ?? "?"} — scout`,
      table: "scout_details",
      column: "document_path",
      match: row.id ? { column: "id", value: row.id } : { column: "profile_id", value: row.profile_id },
      key: row.document_path,
      folder: scoutFolder(row.stages?.code),
      fullName: row.profiles?.full_name ?? row.full_name,
      docLabel: LABELS.scout,
    });
  }

  console.log(`\nLeaders (${leaders.length}):`);
  for (const row of leaders) {
    if (!row.id_card_path) continue;
    await refile({
      label: `${row.profiles?.full_name ?? "?"} — leader`,
      table: "leader_details",
      column: "id_card_path",
      match: { column: "profile_id", value: row.profile_id },
      key: row.id_card_path,
      folder: leaderFolder(row.gender),
      fullName: row.profiles?.full_name,
      docLabel: LABELS.leader,
    });
  }

  // Anything left outside the three top folders that no record points to: old
  // documents of deleted accounts, replaced files, abandoned uploads from the
  // old _incoming/ folder, and the old _Unfiled/ folder. Kept, just moved out
  // of the way into _System/Unfiled/ (keeping their old path, so nothing is
  // ambiguous).
  const referenced = new Set([
    ...scouts.map((r) => r.document_path),
    ...leaders.map((r) => r.id_card_path),
    ...claimed,
  ]);
  const unfiledTarget = (key) =>
    key.startsWith("_Unfiled/") ? `_System/Unfiled/${key.slice("_Unfiled/".length)}` : `_System/Unfiled/${key}`;
  const loose = (await listAll()).filter(
    (key) =>
      !referenced.has(key) &&
      !key.startsWith("Members/") &&
      !key.startsWith("Seasonal Plans/") &&
      !key.startsWith("_System/") &&
      !key.endsWith(".bzEmpty"),
  );
  console.log(`\nUnreferenced files outside Members/, Seasonal Plans/ and _System/: ${loose.length}`);
  for (const key of loose) {
    console.log(`  ${key}  → ${unfiledTarget(key)}`);
    if (APPLY) {
      await copy(key, unfiledTarget(key));
      await remove(key);
    }
  }

  console.log(
    `\nDone: ${moved} ${APPLY ? "moved" : "to move"}, ${skipped} already in place, ${loose.length} unfiled, ${problems} problem(s).`,
  );
  if (!APPLY && (moved || loose.length)) console.log("Run again with --apply to make these changes.");
}

if (DELETE_ORPHANS) await deleteOrphans();
else await organize();
