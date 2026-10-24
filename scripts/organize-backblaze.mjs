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
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

const APPLY = process.argv.includes("--apply");

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
