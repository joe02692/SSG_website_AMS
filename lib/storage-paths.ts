import "server-only";

import { copyObject, deleteObject, objectExists } from "@/lib/b2";
import { SCOUT_STAGES } from "@/lib/onboarding";

/**
 * How the Backblaze bucket is laid out (reorganised Oct 2026). Three folders
 * at the top, so the console reads like a filing cabinet:
 *
 *   Members/
 *     Scouts/<Stage>/<Full name> - Birth certificate.jpg
 *     Leaders/Males/<Full name> - ID card.jpg
 *     Leaders/Females/<Full name> - ID card.jpg
 *     Former members/Scouts/<date> <Full name> - Birth certificate.jpg
 *     Former members/Leaders/<date> <Full name> - ID card.jpg
 *   Seasonal Plans/<Stage>/…  and  Seasonal Plans/<Stage>/Archive/…
 *   _System/
 *     Incoming/<profile id>/…   temporary uploads, filed on save
 *     Unfiled/…                 anything the tidy-up script couldn't place
 *
 * A second member with the same name becomes "<Full name> (2) - …".
 * Documents of a deleted account are moved to Former members, never lost.
 */

export const MEMBERS_ROOT = "Members";
export const SYSTEM_ROOT = "_System";

/** The two kinds of member document, as they appear in file names. */
export const DOCUMENT_LABELS = {
  scout: "Birth certificate",
  leader: "ID card",
} as const;

/**
 * Where the browser's fresh uploads go, one folder per member. Temporary:
 * the save files them under Members/, and a lifecycle rule on this prefix
 * clears anything left behind (see claude/backblaze-folders.md).
 */
export function incomingPrefix(profileId: string): string {
  return `${SYSTEM_ROOT}/Incoming/${profileId}/`;
}

export function scoutFolder(stageCode: string): string {
  const stage = SCOUT_STAGES.find((s) => s.value === stageCode);
  return `${MEMBERS_ROOT}/Scouts/${stage?.label ?? "Stage not set"}`;
}

export function leaderFolder(gender: string | null | undefined): string {
  if (gender === "male") return `${MEMBERS_ROOT}/Leaders/Males`;
  if (gender === "female") return `${MEMBERS_ROOT}/Leaders/Females`;
  return `${MEMBERS_ROOT}/Leaders/Gender not set`;
}

export function formerMembersFolder(kind: "scout" | "leader"): string {
  return `${MEMBERS_ROOT}/Former members/${kind === "scout" ? "Scouts" : "Leaders"}`;
}

/**
 * The member's name as a file name: their name exactly as written, minus
 * anything that isn't a letter, digit, space, hyphen, dot or apostrophe. A "/"
 * in a name would invent a folder; the rest trips up downloads and ZIPs.
 */
export function fileBaseName(fullName: string | null | undefined): string {
  const cleaned = (fullName ?? "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N} .'-]+/gu, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s.]+|[\s.]+$/g, "")
    .slice(0, 80)
    .trim();
  return cleaned || "Unnamed";
}

type Filed =
  | { key: string; cleanup: string[] }
  | { error: string };

/**
 * Files a member's document at `<folder>/<Full name> - <label>.<ext>`.
 *
 * `submitted` is the key from the form: either a fresh upload in this
 * member's own `_System/Incoming/` folder, or the key already on their row (they
 * saved without choosing a new file). Anything else is refused — that is the
 * ownership check.
 *
 * The file is COPIED to its new place; the caller writes the new key to the
 * database and only then deletes the keys in `cleanup`, so a failed save never
 * leaves the row pointing at nothing. If two members share a name, the second
 * becomes "Name (2)", and so on.
 */
export async function fileDocument({
  submitted: submittedKey,
  stored,
  profileId,
  folder,
  fullName,
  label,
}: {
  submitted: string;
  stored: string | null;
  profileId: string;
  folder: string;
  fullName: string | null;
  /** "Birth certificate" or "ID card" — DOCUMENT_LABELS. */
  label: string;
}): Promise<Filed> {
  let submitted = submittedKey;
  let isFresh = submitted.startsWith(incomingPrefix(profileId));
  let isStored = stored !== null && submitted === stored;
  if (!isFresh && !isStored) {
    return { error: "That file doesn't belong to your account." };
  }

  // A page left open after an earlier save can resubmit an upload key that
  // has since been filed (and removed). Fall back to what's on the record.
  if (isFresh && stored && !(await objectExists(submitted))) {
    submitted = stored;
    isFresh = false;
    isStored = true;
  }

  const extension = (submitted.split(".").pop() ?? "jpg").toLowerCase();
  const base = fileBaseName(fullName);

  // Already exactly where it belongs.
  const tail = ` - ${label}.${extension}`;
  if (isStored && submitted.startsWith(`${folder}/${base}`) && submitted.endsWith(tail)) {
    const rest = submitted.slice(`${folder}/${base}`.length, -tail.length);
    if (rest === "" || /^ \(\d+\)$/.test(rest)) return { key: submitted, cleanup: [] };
  }

  let target = "";
  for (let n = 1; n <= 50; n++) {
    const candidate = `${folder}/${base}${n === 1 ? "" : ` (${n})`}${tail}`;
    // Overwriting your own previous file is fine (a replacement); taking a
    // name another member already has is not.
    if (candidate === stored || !(await objectExists(candidate))) {
      target = candidate;
      break;
    }
  }
  if (!target) return { error: "Could not find a free file name. Please try again." };

  await copyObject(submitted, target);

  const cleanup = [submitted, stored].filter(
    (key): key is string => Boolean(key) && key !== target,
  );
  return { key: target, cleanup: [...new Set(cleanup)] };
}

/**
 * Moves a deleted member's document to Members/Former members/, dated, so
 * deleting an account never destroys a child's birth certificate or a
 * leader's ID card. Returns the new key, or null if there was nothing to move.
 */
export async function moveToFormerMembers({
  key,
  kind,
  fullName,
}: {
  key: string | null | undefined;
  kind: "scout" | "leader";
  fullName: string | null;
}): Promise<string | null> {
  if (!key || !(await objectExists(key))) return null;
  const extension = (key.split(".").pop() ?? "jpg").toLowerCase();
  const date = new Date().toISOString().slice(0, 10);
  const base = `${formerMembersFolder(kind)}/${date} ${fileBaseName(fullName)} - ${DOCUMENT_LABELS[kind]}`;
  let target = `${base}.${extension}`;
  for (let n = 2; n <= 50 && (await objectExists(target)); n++) {
    target = `${base} (${n}).${extension}`;
  }
  await copyObject(key, target);
  await deleteObject(key);
  return target;
}
