import "server-only";

import { copyObject, objectExists } from "@/lib/b2";
import { SCOUT_STAGES } from "@/lib/onboarding";

/**
 * Where each member's document is filed in Backblaze, so the bucket reads like
 * a filing cabinet instead of a heap of random ids:
 *
 *   Scouts/Cubs/Ahmed Mohamed.jpg
 *   Scouts/Senior Guides/Mariam Ali.pdf
 *   Leaders/Males/Omar Hassan.jpg
 *   Leaders/Females/Nour Adel (2).jpg      ← a second Nour Adel
 *
 * Uploads first land in `_incoming/<profile_id>/`, because the file is chosen
 * before the form (with the stage or gender) is saved. The save action then
 * files it with fileDocument() below.
 */

/** Where the browser's fresh uploads go, one folder per member. */
export function incomingPrefix(profileId: string): string {
  return `_incoming/${profileId}/`;
}

export function scoutFolder(stageCode: string): string {
  const stage = SCOUT_STAGES.find((s) => s.value === stageCode);
  return `Scouts/${stage?.label ?? "Stage not set"}`;
}

export function leaderFolder(gender: string | null | undefined): string {
  if (gender === "male") return "Leaders/Males";
  if (gender === "female") return "Leaders/Females";
  return "Leaders/Gender not set";
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
 * Files a member's document at `<folder>/<Full name>.<ext>`.
 *
 * `submitted` is the key from the form: either a fresh upload in this
 * member's own `_incoming/` folder, or the key already on their row (they
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
}: {
  submitted: string;
  stored: string | null;
  profileId: string;
  folder: string;
  fullName: string | null;
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
  if (isStored && submitted.startsWith(`${folder}/${base}`) && submitted.endsWith(`.${extension}`)) {
    const rest = submitted.slice(`${folder}/${base}`.length, -(extension.length + 1));
    if (rest === "" || /^ \(\d+\)$/.test(rest)) return { key: submitted, cleanup: [] };
  }

  let target = "";
  for (let n = 1; n <= 50; n++) {
    const candidate = `${folder}/${base}${n === 1 ? "" : ` (${n})`}.${extension}`;
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
