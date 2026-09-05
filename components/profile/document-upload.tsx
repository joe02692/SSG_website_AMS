"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { compressImage } from "@/lib/compress-image";
import {
  DocumentPreview,
  previewKind,
} from "@/components/ui/document-preview";
import {
  createUploadUrlAction,
  getOwnDocumentUrlAction,
  recordDocumentAction,
  removeDocumentAction,
  type DocumentState,
  type OwnDocumentLink,
} from "@/app/dashboard/profile/document-actions";

const initialState: DocumentState = {};
const initialLink: OwnDocumentLink = {};

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/**
 * Uploads the birth certificate straight from the browser to Backblaze B2, and
 * shows it back in a popup afterwards.
 *
 * Four steps to upload: shrink the photo, ask the server for a one-off upload
 * URL (it decides the key and checks who's asking), PUT the file, then tell the
 * server the key.
 *
 * The file never passes through our server — which keeps it under Vercel's
 * ~4.5MB request limit and means the document isn't sitting in a function's
 * memory on its way past.
 *
 * Viewing mints a fresh signed URL on click. The page used to be rendered with
 * one already in it, which expired 60 seconds later — so by the time anyone
 * pressed View it was usually dead.
 */
export function DocumentUpload({ currentPath }: { currentPath: string | null }) {
  const [recordState, recordAction] = useActionState(
    recordDocumentAction,
    initialState,
  );
  const [removeState, removeAction, removing] = useActionState(
    removeDocumentAction,
    initialState,
  );
  const [linkState, linkAction, linking] = useActionState(
    getOwnDocumentUrlAction,
    initialLink,
  );

  const [dismissed, setDismissed] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const keyRef = useRef<HTMLInputElement>(null);
  const navigated = useRef<string | null>(null);
  const id = useId();

  const busy = status !== null;

  useEffect(() => {
    if (linkState.mode !== "download" || !linkState.url) return;
    if (navigated.current === linkState.url) return;
    navigated.current = linkState.url;
    // Content-Disposition: attachment, so this saves the file without
    // navigating away from the page.
    window.location.href = linkState.url;
  }, [linkState.url, linkState.mode]);

  // Derived, not mirrored — see the note in ViewDocumentButton.
  const previewUrl =
    linkState.mode === "view" && linkState.url && linkState.url !== dismissed
      ? linkState.url
      : null;

  const closePreview = useCallback(
    () => setDismissed(linkState.url ?? null),
    [linkState.url],
  );

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

      // This request goes browser → Backblaze, so it is the one step our server
      // cannot see. Its two failure modes need telling apart, because they look
      // identical to a user and have nothing in common:
      //
      //   • fetch THROWS with no status — the browser blocked it before asking.
      //     Either the bucket's CORS rule is missing or doesn't allow the
      //     content-type header, or the hostname failed TLS. Not a connection
      //     problem, however much it resembles one.
      //   • fetch RESOLVES with a bad status — Backblaze answered and refused.
      //     Usually a signature or permissions problem.
      let response: Response;
      try {
        // Content-Type must match what was signed, or the upload is rejected.
        response = await fetch(ticket.url, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
      } catch (cause) {
        console.error("[certificate] the upload request was blocked", cause);
        setLocalError(
          "The browser couldn't reach the storage service. This is almost always the bucket's CORS rule — see Tasks/document-storage.md. Open DevTools → Console for the exact error.",
        );
        return;
      }

      if (!response.ok) {
        console.error(
          "[certificate] storage refused the upload",
          response.status,
          await response.text().catch(() => ""),
        );
        setLocalError(
          `Storage refused the upload (HTTP ${response.status}). Check the bucket name and application key.`,
        );
        return;
      }

      if (keyRef.current) keyRef.current.value = ticket.key;
      formRef.current?.requestSubmit();
    } catch (cause) {
      console.error("[certificate] upload failed before it started", cause);
      setLocalError("Something went wrong preparing the file. Please try again.");
    } finally {
      setStatus(null);
      event.target.value = "";
    }
  }

  const message =
    localError ?? recordState.error ?? removeState.error ?? linkState.error;
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

          <form action={linkAction} className="flex items-center gap-2">
            <button
              type="submit"
              name="mode"
              value="view"
              disabled={linking}
              className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline disabled:opacity-60 dark:text-brand-300"
            >
              {linking ? "…" : "View"}
            </button>
            <span aria-hidden className="text-ink-subtle">
              ·
            </span>
            <button
              type="submit"
              name="mode"
              value="download"
              disabled={linking}
              className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline disabled:opacity-60 dark:text-brand-300"
            >
              Download
            </button>
          </form>

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

      <DocumentPreview
        url={previewUrl}
        title="Your birth certificate"
        kind={previewKind(currentPath ?? "")}
        onClose={closePreview}
      />
    </div>
  );
}
