"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dal";
import { usesScoutDetails } from "@/lib/onboarding";
import {
  ALLOWED_TYPES,
  MAX_UPLOAD_BYTES,
  deleteObject,
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
  const key = `${profile.id}/${randomUUID()}.${EXTENSIONS[contentType]}`;

  try {
    const url = await presignUpload(key, contentType);
    return { url, key };
  } catch {
    return {
      error:
        "Uploads aren't configured on this deployment — the storage settings are missing.",
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

  const { error } = await supabase
    .from("scout_details")
    .update({
      document_path: key,
      document_uploaded_at: new Date().toISOString(),
    })
    .eq("profile_id", profile.id);

  if (error) {
    return { error: "Could not save the document. Please try again." };
  }

  // Remove the file it replaced, so superseded copies don't linger.
  if (existing?.document_path && existing.document_path !== key) {
    await deleteObject(existing.document_path);
  }

  revalidatePath("/dashboard/profile");
  return { notice: "Document uploaded." };
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
