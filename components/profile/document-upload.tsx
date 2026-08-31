"use client";

import { useActionState, useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  recordDocumentAction,
  removeDocumentAction,
  type DocumentState,
} from "@/app/dashboard/profile/actions";

const initialState: DocumentState = {};

const BUCKET = "scout-documents";
const MAX_BYTES = 10 * 1024 * 1024; // must match the bucket's file_size_limit
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/**
 * Uploads the birth certificate / ID document straight from the browser to
 * Supabase Storage, then hands the resulting path to a Server Action.
 *
 * The file deliberately never goes through our server: Server Actions cap
 * bodies at 1MB and Vercel functions at ~4.5MB, and a photo of a certificate
 * is often bigger than both. Storage RLS still applies, because this upload
 * uses the member's own session.
 */
export function DocumentUpload({
  profileId,
  currentPath,
  signedUrl,
}: {
  profileId: string;
  currentPath: string | null;
  /** Short-lived URL for viewing the existing file, minted server-side. */
  signedUrl: string | null;
}) {
  const [state, formAction] = useActionState(recordDocumentAction, initialState);
  const [removeState, removeAction, removing] = useActionState(
    removeDocumentAction,
    initialState,
  );
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const pathRef = useRef<HTMLInputElement>(null);
  const id = useId();

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLocalError(null);

    // Friendly checks. The bucket enforces the same limits server-side, which
    // is the part that actually counts.
    if (!ACCEPTED.includes(file.type)) {
      setLocalError("Use a JPG, PNG, WebP or PDF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError("That file is over 10 MB. Try a smaller photo.");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      // Folder must be the user's id — the storage policies check exactly that.
      const path = `${profileId}/certificate-${Date.now()}.${extension}`;

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });

      if (error) {
        setLocalError("Upload failed. Please try again.");
        return;
      }

      if (pathRef.current) pathRef.current.value = path;
      formRef.current?.requestSubmit();
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  const message = localError ?? state.error ?? removeState.error;
  const notice = state.notice ?? removeState.notice;

  return (
    <div className="space-y-3">
      {notice ? (
        <p
          role="status"
          className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm text-brand-900 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-200"
        >
          {notice}
        </p>
      ) : null}

      {message ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
        >
          {message}
        </p>
      ) : null}

      {currentPath ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-canvas px-3 py-2.5">
          <span className="text-sm text-ink">A document is on file.</span>
          {signedUrl ? (
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline dark:text-brand-300"
            >
              View
            </a>
          ) : null}
          <form action={removeAction} className="ml-auto">
            <button
              type="submit"
              disabled={removing}
              className="text-xs font-medium text-red-600 underline-offset-4 hover:underline disabled:opacity-60"
            >
              {removing ? "Removing…" : "Remove"}
            </button>
          </form>
        </div>
      ) : null}

      <label
        htmlFor={id}
        className="block text-sm font-medium text-ink"
      >
        {currentPath ? "Replace the document" : "Upload the document"}
      </label>
      <p className="text-xs text-ink-subtle">
        A photo or scan of the birth certificate or ID — صورة لشهادة الميلاد.
        JPG, PNG or PDF, up to 10 MB. Only you and the site admins can see it.
      </p>
      <input
        id={id}
        type="file"
        accept={ACCEPTED.join(",")}
        disabled={uploading}
        onChange={handleFile}
        className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0
                   file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-semibold
                   file:text-white hover:file:bg-brand-700 disabled:opacity-60"
      />
      {uploading ? (
        <p className="text-xs text-ink-muted">Uploading…</p>
      ) : null}

      {/* Submitted programmatically once the upload finishes. */}
      <form ref={formRef} action={formAction} className="hidden">
        <input ref={pathRef} type="hidden" name="path" />
      </form>
    </div>
  );
}
