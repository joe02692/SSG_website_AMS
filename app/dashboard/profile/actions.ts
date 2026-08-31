"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/dal";

export type ProfileState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  notice?: string;
};

const MAX_NAME_LENGTH = 120;

export async function updateProfileAction(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  // Server Actions are reachable by direct POST, so this check is the gate —
  // not the page render that happened to precede it.
  const user = await getCurrentUser();
  if (!user) return { error: "You need to be signed in." };

  const raw = formData.get("fullName");
  const fullName = typeof raw === "string" ? raw.trim() : "";

  if (fullName.length < 2) {
    return { fieldErrors: { fullName: "Please enter your full name." } };
  }
  if (fullName.length > MAX_NAME_LENGTH) {
    return {
      fieldErrors: {
        fullName: `Keep it under ${MAX_NAME_LENGTH} characters.`,
      },
    };
  }

  const supabase = await createClient();

  // Note what is NOT in this update: `role`. Even if a crafted request added
  // it, the "update own" RLS policy plus the prevent_role_escalation()
  // trigger would reject the change at the database.
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (error) {
    return { error: "Could not save your details. Please try again." };
  }

  // The header greets members by name, so refresh the whole layout.
  revalidatePath("/", "layout");
  return { notice: "Your details have been saved." };
}

// ---------------------------------------------------------------------------
// Birth certificate / ID document — شهادة الميلاد
// ---------------------------------------------------------------------------
export type DocumentState = { error?: string; notice?: string };

const DOCUMENT_BUCKET = "scout-documents";

/**
 * Records the path of a document the browser has already uploaded.
 *
 * The file itself never passes through here — it goes straight from the
 * browser to Supabase Storage, where the bucket's own size and MIME limits
 * and the per-folder RLS policies apply. This action only writes the pointer,
 * after checking the path really is inside the caller's own folder.
 */
export async function recordDocumentAction(
  _prevState: DocumentState,
  formData: FormData,
): Promise<DocumentState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You need to be signed in." };

  const path = formData.get("path");
  if (typeof path !== "string" || !path) {
    return { error: "Nothing was uploaded." };
  }

  // Storage RLS already refuses writes outside the caller's folder, but a
  // path pointing at someone else's file would still be recorded against this
  // profile if we trusted it blindly.
  if (!path.startsWith(`${user.id}/`)) {
    return { error: "That file doesn't belong to your account." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("scout_details")
    .select("document_path")
    .eq("profile_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("scout_details")
    .update({ document_path: path })
    .eq("profile_id", user.id);

  if (error) {
    return { error: "Could not save the document. Please try again." };
  }

  // Clear out the file it replaced, so old certificates don't accumulate.
  if (existing?.document_path && existing.document_path !== path) {
    await supabase.storage.from(DOCUMENT_BUCKET).remove([existing.document_path]);
  }

  revalidatePath("/dashboard/profile");
  return { notice: "Document uploaded." };
}

/** Removes the document from storage and forgets the path. */
export async function removeDocumentAction(
  _prevState: DocumentState,
): Promise<DocumentState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You need to be signed in." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("scout_details")
    .select("document_path")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existing?.document_path) {
    await supabase.storage.from(DOCUMENT_BUCKET).remove([existing.document_path]);
  }

  await supabase
    .from("scout_details")
    .update({ document_path: null })
    .eq("profile_id", user.id);

  revalidatePath("/dashboard/profile");
  return { notice: "Document removed." };
}
