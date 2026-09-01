"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dal";
import { isSiteAdminRole } from "@/lib/roles";

export type DocumentLinkState = { url?: string; error?: string };

/**
 * Mints a short-lived signed URL for one scout's document.
 *
 * Deliberately on demand rather than generating links for the whole table on
 * page load: a roster of 400 signed URLs sitting in the HTML is 400 live links
 * to children's identity documents, any of which could be copied out of the
 * page source. One click, one link, sixty seconds.
 *
 * The signed URL is created with the caller's own session, so the storage RLS
 * policy ("scout docs: site admins read") is what actually authorises it —
 * this role check just fails fast with a readable message.
 */
export async function getDocumentUrlAction(
  _prevState: DocumentLinkState,
  formData: FormData,
): Promise<DocumentLinkState> {
  const viewer = await getCurrentProfile();
  if (!isSiteAdminRole(viewer?.role)) {
    return { error: "Not allowed." };
  }

  const path = formData.get("path");
  if (typeof path !== "string" || !path) return { error: "No document." };

  // "download" asks Supabase to send Content-Disposition: attachment with the
  // given filename, so the browser saves the file instead of displaying it.
  const wantsDownload = formData.get("mode") === "download";
  const rawName = formData.get("filename");
  const filename =
    typeof rawName === "string" && rawName ? rawName : "certificate";

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("scout-documents")
    .createSignedUrl(
      path,
      60,
      wantsDownload
        ? { download: `${filename}.${path.split(".").pop() ?? "jpg"}` }
        : undefined,
    );

  if (error || !data?.signedUrl) {
    return { error: "Could not open that document." };
  }

  return { url: data.signedUrl };
}
