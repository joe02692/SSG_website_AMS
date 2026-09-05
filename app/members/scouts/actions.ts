"use server";

import { getCurrentProfile } from "@/lib/dal";
import { isSiteAdminRole } from "@/lib/roles";
import { missingStorageEnv, presignDownload } from "@/lib/b2";
import { nameSlug } from "@/lib/documents";

export type DocumentLinkState = {
  url?: string;
  /** Echoed back so the client knows whether to pop it up or save it. */
  mode?: "view" | "download";
  error?: string;
};

/**
 * Mints a short-lived signed URL for one scout's document.
 *
 * ⚠️ This role check is the whole security model. Backblaze has no knowledge
 * of Supabase users, so unlike the database — which would refuse a bad read
 * even if this code were wrong — nothing else is watching. Do not relax it.
 *
 * Minted on demand rather than for the whole table on page load: 400 signed
 * URLs sitting in the HTML would be 400 live links to children's identity
 * documents, copyable straight out of the page source.
 */
export async function getDocumentUrlAction(
  _prevState: DocumentLinkState,
  formData: FormData,
): Promise<DocumentLinkState> {
  const viewer = await getCurrentProfile();
  if (!isSiteAdminRole(viewer?.role)) {
    return { error: "Not allowed." };
  }

  const key = formData.get("path");
  if (typeof key !== "string" || !key) return { error: "No document." };

  const wantsDownload = formData.get("mode") === "download";
  const rawName = formData.get("filename");
  const base = nameSlug(typeof rawName === "string" ? rawName : null);
  const extension = key.split(".").pop() ?? "jpg";

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
    console.error("[certificate] could not sign a download URL", error);
    return { error: "Storage refused the request. Check the server logs." };
  }
}
