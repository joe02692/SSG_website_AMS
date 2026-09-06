"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { compressImage } from "@/lib/compress-image";
import { DocumentPreview, previewKind } from "@/components/ui/document-preview";
import {
  createUploadUrlAction,
  getOwnDocumentUrlAction,
} from "@/app/dashboard/profile/document-actions";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/**
 * A document upload that lives INSIDE another form.
 *
 * The ordering problem this solves: the document is required to finish
 * registration, but the row it belongs to (scout_details / leader_details)
 * does not exist until that same form is submitted. The existing
 * DocumentUpload component writes straight to the row, so it cannot run here —
 * there is nothing yet to write to.
 *
 * So the two halves are split. The file goes to Backblaze the moment it is
 * chosen (the object key is `<profile_id>/…`, built server-side from the
 * session, which exists long before any details row does). The resulting key
 * is parked in a hidden input, and the surrounding form's action writes it as
 * a column when it creates the row. One insert, no orphan row, and no window
 * where a member is registered without their document.
 *
 * A file uploaded by someone who then abandons the form is an orphan object in
 * the bucket. That is the deliberate trade: a few stray objects under a
 * profile's own prefix, versus blocking registration on an upload that cannot
 * happen yet. They are cheap, private, and overwritten on the next attempt.
 */
export function DocumentField({
  fieldId,
  name,
  required,
  existingPath,
}: {
  fieldId: string;
  /** Column this key is stored in — document_path or id_card_path. */
  name: string;
  required?: boolean;
  /** Set when re-editing: a document is already on file. */
  existingPath?: string;
}) {
  const [key, setKey] = useState<string>(existingPath ?? "");
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [linking, startLinking] = useTransition();
  const keyRef = useRef<HTMLInputElement>(null);

  const busy = status !== null;
  const haveDocument = key !== "";
  // Only a key that was already saved can be fetched back; one uploaded a
  // moment ago is not on the row yet, so there is nothing for the server to
  // look up.
  const canView = Boolean(existingPath) && key === existingPath;

  const closePreview = useCallback(() => setPreviewUrl(null), []);

  /**
   * View and Download call the Server Action directly rather than through a
   * <form>. This component is rendered INSIDE the details form, and a nested
   * form is invalid HTML — the browser drops the inner one, so the buttons
   * would silently submit the outer form instead of fetching a link.
   */
  function openDocument(mode: "view" | "download") {
    setError(null);
    startLinking(async () => {
      const data = new FormData();
      data.set("mode", mode);
      const result = await getOwnDocumentUrlAction({}, data);
      if (result.error || !result.url) {
        setError(result.error ?? "Could not open the document.");
        return;
      }
      if (mode === "download") window.location.href = result.url;
      else setPreviewUrl(result.url);
    });
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const original = event.target.files?.[0];
    if (!original) return;

    setError(null);

    if (!ACCEPTED.includes(original.type)) {
      setError("Use a JPG, PNG, WebP or PDF.");
      event.target.value = "";
      return;
    }

    try {
      setStatus("Preparing…");
      const file = await compressImage(original);

      if (file.size > MAX_BYTES) {
        setError("That file is over 10 MB even after shrinking.");
        return;
      }

      const ticketData = new FormData();
      ticketData.set("contentType", file.type);
      ticketData.set("size", String(file.size));

      const ticket = await createUploadUrlAction({}, ticketData);
      if (ticket.error || !ticket.url || !ticket.key) {
        setError(ticket.error ?? "Could not start the upload.");
        return;
      }

      setStatus("Uploading…");
      let response: Response;
      try {
        response = await fetch(ticket.url, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
      } catch (cause) {
        console.error("[document] the upload request was blocked", cause);
        setError(
          "The browser couldn't reach the storage service — usually the bucket's CORS rule. Open DevTools → Console for the exact error.",
        );
        return;
      }

      if (!response.ok) {
        console.error("[document] storage refused the upload", response.status);
        setError(`Storage refused the upload (HTTP ${response.status}).`);
        return;
      }

      setKey(ticket.key);
      setFileName(original.name);
      if (keyRef.current) keyRef.current.value = ticket.key;
    } catch (cause) {
      console.error("[document] upload failed before it started", cause);
      setError("Something went wrong preparing the file. Please try again.");
    } finally {
      setStatus(null);
      event.target.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {/* What the surrounding form actually submits. */}
      <input ref={keyRef} type="hidden" name={name} defaultValue={key} />

      <input
        id={fieldId}
        type="file"
        accept={ACCEPTED.join(",")}
        disabled={busy}
        // `required` on a file input would demand a file on every save, even
        // when one is already on file from a previous visit. The server checks
        // the key instead, which is the thing that actually matters.
        required={required && !haveDocument}
        onChange={handleFile}
        className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0
                   file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-semibold
                   file:text-white hover:file:bg-brand-700 disabled:opacity-60"
      />

      {status ? (
        <p role="status" className="text-xs text-ink-muted">
          {status}
        </p>
      ) : null}

      {haveDocument && !status ? (
        <div className="flex flex-wrap items-center gap-3">
          <p role="status" className="text-xs font-medium text-success-ink">
            {fileName
              ? `Uploaded ${fileName}.`
              : "A document is on file."}{" "}
            Choose a different file to replace it.
          </p>
          {canView ? (
            <span className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => openDocument("view")}
                disabled={linking}
                className="font-medium text-brand-ink underline-offset-4 hover:underline disabled:opacity-60"
              >
                {linking ? "…" : "View"}
              </button>
              <span aria-hidden className="text-ink-subtle">
                ·
              </span>
              <button
                type="button"
                onClick={() => openDocument("download")}
                disabled={linking}
                className="font-medium text-brand-ink underline-offset-4 hover:underline disabled:opacity-60"
              >
                Download
              </button>
            </span>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-xs font-medium text-danger-ink">
          {error}
        </p>
      ) : null}

      <DocumentPreview
        url={previewUrl}
        title="Your document"
        kind={previewKind(key)}
        onClose={closePreview}
      />
    </div>
  );
}
