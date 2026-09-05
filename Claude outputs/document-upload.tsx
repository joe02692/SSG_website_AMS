"use client";

import { useActionState, useId, useRef, useState } from "react";
import { compressImage } from "@/lib/compress-image";
import {
  createUploadUrlAction,
  recordDocumentAction,
  removeDocumentAction,
  type DocumentState,
} from "@/app/dashboard/profile/document-actions";

const initialState: DocumentState = {};

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/**
 * Uploads the birth certificate straight from the browser to Backblaze B2.
 *
 * Four steps: shrink the photo, ask the server for a one-off upload URL (it
 * decides the key and checks who's asking), PUT the file, then tell the server
 * the key.
 *
 * The file never passes through our server — which keeps it under Vercel's
 * ~4.5MB request limit and means the document isn't sitting in a function's
 * memory on its way past.
 */
export function DocumentUpload({
  currentPath,
  signedUrl,
}: {
  currentPath: string | null;
  /** Short-lived URL for viewing the existing file, minted server-side. */
  signedUrl: string | null;
}) {
  const [recordState, recordAction] = useActionState(
    recordDocumentAction,
    initialState,
  );
  const [removeState, removeAction, removing] = useActionState(
    removeDocumentAction,
    initialState,
  );
  const [status, setStatus] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const keyRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const busy = status !== null;

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const original = event.target.files?.[0];
    if (!original) return;

    setLocalError(null);

    if (!ACCEPTED.includes(original.type)) {
      setLocalError("Use a JPG, PNG, WebP or PDF.");
      event.target.value = "";
      return;
    }

    try {
      setStatus("Preparing…");
      // Shrink before anything else — a 3MB phone photo becomes ~500KB, and
      // the original never leaves the device.
      const file = await compressImage(original);

      if (file.size > MAX_BYTES) {
        setLocalError("That file is over 10 MB even after shrinking.");
        return;
      }

      const ticketData = new FormData();
      ticketData.set("contentType", file.type);
      ticketData.set("size", String(file.size));

      const ticket = await createUploadUrlAction({}, ticketData);
      if (ticket.error || !ticket.url || !ticket.key) {
        setLocalError(ticket.error ?? "Could not start the upload.");
        return;
      }

      setStatus("Uploading…");
      // Content-Type must match what was signed, or the upload is rejected.
      const response = await fetch(ticket.url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        setLocalError("Upload failed. Please try again.");
        return;
      }

      if (keyRef.current) keyRef.current.value = ticket.key;
      formRef.current?.requestSubmit();
    } catch {
      setLocalError("Upload failed. Check your connection and try again.");
    } finally {
      setStatus(null);
      event.target.value = "";
    }
  }

  const message = localError ?? recordState.error ?? removeState.error;
  const notice = recordState.notice ?? removeState.notice;

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

      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {currentPath ? "Replace the document" : "Upload the document"}
      </label>
      <p className="text-xs text-ink-subtle">
        A photo or scan of the birth certificate or ID — صورة لشهادة الميلاد.
        JPG, PNG or PDF. Large photos are shrunk automatically, so uploading
        straight from your phone is fine. Only you and the site admins can see
        it.
      </p>
      <input
        id={id}
        type="file"
        accept={ACCEPTED.join(",")}
        disabled={busy}
        onChange={handleFile}
        className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0
                   file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-semibold
                   file:text-white hover:file:bg-brand-700 disabled:opacity-60"
      />
      {status ? <p className="text-xs text-ink-muted">{status}</p> : null}

      {/* Submitted programmatically once the upload finishes. */}
      <form ref={formRef} action={recordAction} className="hidden">
        <input ref={keyRef} type="hidden" name="key" />
      </form>
    </div>
  );
}
