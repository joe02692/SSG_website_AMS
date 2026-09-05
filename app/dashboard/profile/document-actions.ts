"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dal";
import { nameSlug } from "@/lib/documents";
import { usesScoutDetails } from "@/lib/onboarding";
import {
  ALLOWED_TYPES,
  MAX_UPLOAD_BYTES,
  deleteObject,
  missingStorageEnv,
  presignDownload,
  presignUpload,
} from "@/lib/b2";

export type UploadTicket = {
  url?: string;
  key?: string;
  error?: string;
};

export type DocumentState = { error?: string; notice?: string };

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/**
 * Issues a one-off URL the browser can upload a single file to.
 *
 * This is the security boundary. B2 doesn't know who Supabase users are, so
 * everything depends on the checks here:
 *   • the caller must be signed in and be a scout
 *   • the key is built server-side from THEIR id — never from user input, so
 *     nobody can aim an upload at someone else's folder
 *   • the content type is pinned into the signature
 *   • the URL expires in five minutes
 */
export async function createUploadUrlAction(
  _prev: UploadTicket,
  formData: FormData,
): Promise<UploadTicket> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "You need to be signed in." };
  if (!usesScoutDetails(profile.role)) {
    return { error: "Only scouts upload a birth certificate." };
  }

  const contentType = String(formData.get("contentType") ?? "");
  const size = Number(formData.get("size") ?? 0);

  if (!ALLOWED_TYPES.includes(contentType)) {
    return { error: "Use a JPG, PNG, WebP or PDF." };
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_UPLOAD_BYTES) {
    return { error: "That file is over 10 MB. Try a smaller photo." };
  }

  // Built from the session, not the request body.
  //
  // The name comes from the signed-in profile rather than a field on the form.
  // Two reasons: the member never has to type it, and it cannot be wrong — a
  // typed box lets someone save "Ahmed" on Youssef's account, and once a few
  // hundred of those exist nobody can trust a filename again. The server
  // already knows exactly whose account this is.
  //
  // Eight hex characters, not a whole UUID, because these live under
  // <profile_id>/ — the only files they could collide with are that same
  // member's own, of which there is normally one.
  const suffix = randomUUID().replace(/-/g, "").slice(0, 8);
  const key = `${profile.id}/${nameSlug(profile.full_name)}_${suffix}.${EXTENSIONS[contentType]}`;

  try {
    const url = await presignUpload(key, contentType);
    return { url, key };
  } catch (error) {
    // Naming the missing variables is the difference between a five-minute fix
    // and an afternoon of guessing which one of five is absent.
    const missing = missingStorageEnv();
    if (missing.length > 0) {
      return {
        error: `Uploads aren't configured on this deployment — missing ${missing.join(", ")}. Add them in Vercel → Settings → Environment Variables, then redeploy.`,
      };
    }
    console.error("[certificate] could not sign an upload URL", error);
    return {
      error:
        "Storage rejected the upload request. The settings are present but not working — check the server logs.",
    };
  }
}

/**
 * Records a key the browser has just uploaded to, and clears the file it
 * replaced. Re-checks the key prefix: a valid session must not be able to
 * point their profile at another scout's document.
 */
export async function recordDocumentAction(
  _prev: DocumentState,
  formData: FormData,
): Promise<DocumentState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "You need to be signed in." };

  const key = formData.get("key");
  if (typeof key !== "string" || !key) return { error: "Nothing was uploaded." };
  if (!key.startsWith(`${profile.id}/`)) {
    return { error: "That file doesn't belong to your account." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("scout_details")
    .select("document_path")
    .eq("profile_id", profile.id)
    .maybeSingle();

  // .select() so a successful call also tells us how many rows it touched.
  // Without it, an update matching nothing looks identical to one that worked,
  // and the member is told their certificate is saved when it isn't.
  let { data: updated, error } = await supabase
    .from("scout_details")
    .update({
      document_path: key,
      document_uploaded_at: new Date().toISOString(),
    })
    .eq("profile_id", profile.id)
    .select("profile_id");

  // Migration 0013 adds document_uploaded_at, and a database that never ran it
  // fails the whole update over that one field — which is how a file can sit
  // safely in Backblaze while the member is told the save failed. Record the
  // path anyway; the timestamp is only informational, and losing the link to
  // an uploaded file is far worse than losing a date.
  //
  // Two codes, because two different components can refuse. PGRST204 is
  // PostgREST checking the write against its cached schema and rejecting it
  // before Postgres is involved; 42703 is Postgres's own undefined_column, for
  // the case where PostgREST's cache is stale in the other direction.
  const missingTimestampColumn =
    (error?.code === "PGRST204" || error?.code === "42703") &&
    (error?.message ?? "").includes("document_uploaded_at");

  if (missingTimestampColumn) {
    console.error(
      "[certificate] scout_details.document_uploaded_at is missing — run supabase/migrations/0013_document_expiry.sql",
    );
    ({ data: updated, error } = await supabase
      .from("scout_details")
      .update({ document_path: key })
      .eq("profile_id", profile.id)
      .select("profile_id"));
  }

  if (error) {
    // The generic "please try again" that used to be here was the actual bug
    // in disguise: the database said exactly what was wrong and we replaced it
    // with a sentence that invited the member to repeat a failing action.
    console.error("[certificate] could not record the document", error);
    return {
      error: `Could not save the document — the database refused the update (${error.code ?? "unknown"}: ${error.message}).`,
    };
  }

  if (!updated || updated.length === 0) {
    return {
      error:
        "Your registration details haven't been filled in yet, so there's nowhere to attach the certificate. Complete the membership questions above first.",
    };
  }

  // Remove the file it replaced, so superseded copies don't linger.
  if (existing?.document_path && existing.document_path !== key) {
    await deleteObject(existing.document_path);
  }

  revalidatePath("/dashboard/profile");
  return {
    notice: missingTimestampColumn
      ? "Upload done. (Note for admins: migration 0013 hasn't been run on this database.)"
      : "Upload done.",
  };
}

export type OwnDocumentLink = {
  url?: string;
  mode?: "view" | "download";
  error?: string;
};

/**
 * A fresh signed URL for the caller's OWN document.
 *
 * Deliberately takes no key: it reads the path out of the caller's own row, so
 * there is no parameter to tamper with. A scout cannot ask this for someone
 * else's certificate because there is nothing to ask with.
 *
 * Minted on click, not at page render — a URL signed while the page was being
 * built has often expired by the time anyone presses the button.
 */
export async function getOwnDocumentUrlAction(
  _prev: OwnDocumentLink,
  formData: FormData,
): Promise<OwnDocumentLink> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "You need to be signed in." };

  const supabase = await createClient();
  const { data } = await supabase
    .from("scout_details")
    .select("document_path")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const key = data?.document_path;
  if (!key) return { error: "No document on file." };

  const wantsDownload = formData.get("mode") === "download";
  const extension = key.split(".").pop() ?? "jpg";
  const base = nameSlug(profile.full_name);

  try {
    const url = await presignDownload(
      key,
      wantsDownload ? `${base}-birth-certificate.${extension}` : undefined,
    );
    return { url, mode: wantsDownload ? "download" : "view" };
  } catch (error) {
    const missing = missingStorageEnv();
    if (missing.length > 0) {
      return { error: `Storage not configured (missing ${missing.join(", ")}).` };
    }
    console.error("[certificate] could not sign a view URL", error);
    return { error: "Could not open the document. Please try again." };
  }
}

/** Removes the file from storage and forgets the key. */
export async function removeDocumentAction(
  _prev: DocumentState,
): Promise<DocumentState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "You need to be signed in." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("scout_details")
    .select("document_path")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (existing?.document_path) {
    await deleteObject(existing.document_path);
  }

  await supabase
    .from("scout_details")
    .update({ document_path: null, document_uploaded_at: null })
    .eq("profile_id", profile.id);

  revalidatePath("/dashboard/profile");
  return { notice: "Document removed." };
}
