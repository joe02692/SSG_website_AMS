import { timingSafeEqual } from "node:crypto";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { missingStorageEnv, objectExistsStrict } from "@/lib/b2";
import { MEMBERS_ROOT, moveToFormerMembers, nameFromDocumentKey } from "@/lib/storage-paths";

/**
 * Supabase Database Webhook: a scout_details or leader_details row was
 * deleted. Moves that row's document to Members/Former members/ in Backblaze,
 * so members deleted straight from the Supabase dashboard or SQL editor don't
 * leave files behind with nothing pointing to them. Nothing is ever deleted.
 *
 * Deleting a user (auth.users / profiles) cascades to these two tables, and
 * the webhook fires for the cascaded rows too, so these two hooks cover it.
 *
 * Safe to call any number of times:
 *   • file already moved (e.g. /admin moved it before deleting the account,
 *     or this is a repeat) or never uploaded → 200, nothing to do
 *   • file still referenced by another row → 200, left alone
 * Only a missing/wrong secret (401), a bad request (400) or storage being
 * unreachable (500) are errors.
 *
 * Setup: claude/member-deleted-webhook.md (project docs).
 */

const TABLES = {
  scout_details: { column: "document_path", kind: "scout" },
  leader_details: { column: "id_card_path", kind: "leader" },
} as const;

type Payload = {
  type?: string;
  table?: string;
  schema?: string;
  old_record?: Record<string, unknown> | null;
};

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Constant-time comparison, so the secret can't be guessed byte by byte. */
function secretMatches(given: string | null): boolean {
  const expected = process.env.MEMBER_WEBHOOK_SECRET;
  if (!expected || expected.length < 24 || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!process.env.MEMBER_WEBHOOK_SECRET) {
    console.error("[member-deleted] MEMBER_WEBHOOK_SECRET is not set — refusing every request");
    return json(503, { error: "Webhook not configured" });
  }
  if (!secretMatches(request.headers.get("x-webhook-secret"))) {
    return json(401, { error: "Unauthorized" });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return json(400, { error: "Body must be JSON" });
  }

  if (payload.type !== "DELETE" || payload.schema !== "public") {
    return json(200, { ok: true, skipped: "not a delete in public" });
  }
  const table = payload.table as keyof typeof TABLES | undefined;
  if (!table || !(table in TABLES)) {
    return json(200, { ok: true, skipped: "table not handled" });
  }
  const { column, kind } = TABLES[table];
  const record = payload.old_record ?? {};
  const key = typeof record[column] === "string" ? (record[column] as string) : "";

  // No document on the row, or not a member document at all: nothing to do.
  // Only Members/… and the pre-October Scouts/… and Leaders/… folders are ever
  // touched — never Seasonal Plans/ or _System/.
  if (!key) return json(200, { ok: true, skipped: "no document" });
  const memberFile =
    key.startsWith(`${MEMBERS_ROOT}/`) || key.startsWith("Scouts/") || key.startsWith("Leaders/");
  if (!memberFile) return json(200, { ok: true, skipped: "not a member document" });
  if (key.startsWith(`${MEMBERS_ROOT}/Former members/`)) {
    return json(200, { ok: true, skipped: "already in Former members" });
  }

  if (missingStorageEnv().length > 0) {
    return json(500, { error: "Storage not configured" });
  }

  // Already moved (by /admin before the account was deleted, or by an
  // earlier call) or never uploaded: done.
  let exists: boolean;
  try {
    exists = await objectExistsStrict(key);
  } catch (error) {
    console.error("[member-deleted] could not reach Backblaze", error);
    return json(500, { error: "Storage unreachable" });
  }
  if (!exists) return json(200, { ok: true, skipped: "file already gone or moved" });

  // A stale or replayed call must never take a file a live member still uses.
  let admin;
  try {
    admin = createAdminSupabase();
  } catch {
    return json(500, { error: "SUPABASE_SERVICE_ROLE_KEY missing" });
  }
  const [scouts, leaders] = await Promise.all([
    admin.from("scout_details").select("profile_id", { count: "exact", head: true }).eq("document_path", key),
    admin.from("leader_details").select("profile_id", { count: "exact", head: true }).eq("id_card_path", key),
  ]);
  if (scouts.error || leaders.error) {
    console.error("[member-deleted] could not check references", scouts.error ?? leaders.error);
    return json(500, { error: "Could not check the database" });
  }
  if ((scouts.count ?? 0) + (leaders.count ?? 0) > 0) {
    return json(200, { ok: true, skipped: "still used by a member" });
  }

  // The profile is usually gone by now (cascade), so the name comes from the
  // row (children registered by a parent) or from the file's own name.
  const fullName =
    (typeof record.full_name === "string" && record.full_name.trim()) || nameFromDocumentKey(key);

  try {
    const movedTo = await moveToFormerMembers({ key, kind, fullName });
    console.info(`[member-deleted] ${table}: ${key} → ${movedTo ?? "(nothing to move)"}`);
    return json(200, { ok: true, movedTo });
  } catch (error) {
    // Two calls for the same row at once: the other one moved it first.
    try {
      if (!(await objectExistsStrict(key))) {
        return json(200, { ok: true, skipped: "moved by a parallel call" });
      }
    } catch {
      // Fall through to the error below.
    }
    console.error("[member-deleted] could not move the document", error);
    return json(500, { error: "Could not move the document" });
  }
}

/** Anything but POST. */
export function GET() {
  return json(405, { error: "Method not allowed" });
}
