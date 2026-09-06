"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dal";
import { isStaffRole } from "@/lib/roles";
import { nameSlug } from "@/lib/documents";
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
 *   • the caller must be signed in
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

  // Any signed-in member may upload: scouts a birth certificate, staff an ID
  // card photo. The role check that used to live here is gone because it no
  // longer decides anything — the key is built from this member's own profile
  // id either way, and which COLUMN the key lands in is decided by the save
  // action from the stored role, never from the request.

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

/* recordDocumentAction lived here.
 *
 * It updated scout_details after a standalone upload on the profile page.
 * Both documents are now required fields inside the registration form, so the
 * key is written by the same action that creates the row — one insert instead
 * of an upload that had to find a row to attach itself to. The old flow could
 * not work during onboarding at all, because the row did not exist yet. */

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

  // Which table and column holds this member's document is decided by their
  // STORED role — a scout's birth certificate lives in scout_details, a
  // leader's ID card in leader_details. Nothing about that comes from the
  // request, so there is no parameter to tamper with.
  const supabase = await createClient();
  const staff = isStaffRole(profile.role);

  const { data } = staff
    ? await supabase
        .from("leader_details")
        .select("id_card_path")
        .eq("profile_id", profile.id)
        .maybeSingle()
    : await supabase
        .from("scout_details")
        .select("document_path")
        .eq("profile_id", profile.id)
        .maybeSingle();

  const key = staff
    ? (data as { id_card_path?: string } | null)?.id_card_path
    : (data as { document_path?: string } | null)?.document_path;
  if (!key) return { error: "No document on file." };

  const wantsDownload = formData.get("mode") === "download";
  const extension = key.split(".").pop() ?? "jpg";
  const base = nameSlug(profile.full_name);
  const label = staff ? "id-card" : "birth-certificate";

  try {
    const url = await presignDownload(
      key,
      wantsDownload ? `${base}-${label}.${extension}` : undefined,
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

  // Leaders cannot remove their ID card: leader_details.id_card_path is NOT
  // NULL by the DBMS team's spec, so there is no valid "no document" state to
  // move to. Replacing it is done by uploading a new one from the profile
  // form, which overwrites the key and deletes the old object.
  if (isStaffRole(profile.role)) {
    return {
      error:
        "An ID card photo is required for leaders. Upload a replacement instead of removing this one.",
    };
  }

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
