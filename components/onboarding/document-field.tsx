"use client";

import { useCallback, useImperativeHandle, useRef, useState, useTransition, type RefObject } from "react";
import { compressImage } from "@/lib/compress-image";
import { DocumentPreview, previewKind } from "@/components/ui/document-preview";
import {
  createUploadUrlAction,
  getOwnDocumentUrlAction,
} from "@/app/dashboard/profile/document-actions";
import { useT } from "@/lib/i18n/client";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/** What DetailsForm can ask of the document field when the form is sent. */
export type DocumentController = {
  /** A new file is chosen and waiting to be uploaded. */
  hasPending: () => boolean;
  /** Uploads the waiting file and returns its key (or an error to show). */
  upload: () => Promise<{ key?: string; error?: string }>;
};

/**
 * A document upload that lives INSIDE another form.
 *
 * The ordering problem this solves: the document is required to finish
 * registration, but the row it belongs to (scout_details / leader_details)
 * does not exist until that same form is submitted. The existing
 * DocumentUpload component writes straight to the row, so it cannot run here —
 * there is nothing yet to write to.
 *
 * So the two halves are split. Choosing a file only prepares it (shrinks a
 * photo, checks type and size) and keeps it in the page. Nothing is uploaded
 * until the member presses Save AND checkDetailsAction has approved every
 * other answer (Zyad, Oct 2026: "only upload if all details are correct").
 * DetailsForm then calls upload() through `controller`: the file goes to the
 * member's temporary uploads folder (a key built server-side from the
 * session), its key is put in the form, and the save files it under Members/.
 * One insert, no orphan row, and no window where a member is registered
 * without their document.
 */
export function DocumentField({
  fieldId,
  name,
  required,
  existingPath,
  controller,
  childId,
}: {
  fieldId: string;
  /** Column this key is stored in — document_path or id_card_path. */
  name: string;
  required?: boolean;
  /** Set when re-editing: a document is already on file. */
  existingPath?: string;
  /** Filled in here so the surrounding form can upload at the right moment. */
  controller?: RefObject<DocumentController | null>;
  /** A parent viewing their child's certificate (0025). */
  childId?: string;
}) {
  const [key, setKey] = useState<string>(existingPath ?? "");
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [linking, startLinking] = useTransition();
  const keyRef = useRef<HTMLInputElement>(null);
  /** The prepared file, waiting for the form to be approved. */
  const pendingRef = useRef<File | null>(null);
  const t = useT().account.documents;

  const busy = status !== null;
  const [hasPending, setHasPending] = useState(false);
  const haveDocument = key !== "" || hasPending;
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
      if (childId) data.set("childId", childId);
      const result = await getOwnDocumentUrlAction({}, data);
      if (result.error || !result.url) {
        setError(result.error ?? t.couldNotOpen);
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
      setError(t.wrongType);
      event.target.value = "";
      return;
    }

    try {
      setStatus(t.preparing);
      const file = await compressImage(original);

      if (file.size > MAX_BYTES) {
        setError(t.tooBig);
        return;
      }

      // Kept here, not uploaded: see the note at the top of this file.
      pendingRef.current = file;
      setHasPending(true);
      setFileName(original.name);
    } catch (cause) {
      console.error("[document] could not prepare the file", cause);
      setError(t.somethingWrong);
    } finally {
      setStatus(null);
      event.target.value = "";
    }
  }

  /** Called by the form once every other answer has been approved. */
  const upload = useCallback(async (): Promise<{ key?: string; error?: string }> => {
    const file = pendingRef.current;
    if (!file) return { key };
    setError(null);
    try {
      const ticketData = new FormData();
      ticketData.set("contentType", file.type);
      ticketData.set("size", String(file.size));

      const ticket = await createUploadUrlAction({}, ticketData);
      if (ticket.error || !ticket.url || !ticket.key) {
        return { error: ticket.error ?? t.couldNotStart };
      }

      setStatus(t.uploading);
      let response: Response;
      try {
        response = await fetch(ticket.url, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
      } catch (cause) {
        console.error("[document] the upload request was blocked", cause);
        return { error: t.blocked };
      }
      if (!response.ok) {
        console.error("[document] storage refused the upload", response.status);
        return { error: t.refused(response.status) };
      }

      pendingRef.current = null;
      setHasPending(false);
      setKey(ticket.key);
      if (keyRef.current) keyRef.current.value = ticket.key;
      return { key: ticket.key };
    } catch (cause) {
      console.error("[document] upload failed before it started", cause);
      return { error: t.somethingWrong };
    } finally {
      setStatus(null);
    }
  }, [key, t]);

  // What the surrounding form calls when it is sent (see DetailsForm).
  useImperativeHandle(
    controller,
    () => ({ hasPending: () => pendingRef.current !== null, upload }),
    [upload],
  );

  return (
    <div className="space-y-2">
      {/* What the surrounding form actually submits. */}
      <input ref={keyRef} type="hidden" name={name} defaultValue={key} />

      {/* The native file button speaks the browser's language, not the
          site's, so it is hidden and a label in the page language stands in
          for it. The input stays focusable and is what the form label names. */}
      <div className="flex flex-wrap items-center gap-3">
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
        className="peer sr-only"
      />
      <label
        htmlFor={fieldId}
        aria-hidden
        className="cursor-pointer rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white
                   transition hover:bg-brand-700 peer-focus-visible:outline-2
                   peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600
                   peer-disabled:cursor-not-allowed peer-disabled:opacity-60"
      >
        {t.chooseFile}
      </label>
      <span className="min-w-0 truncate text-sm text-ink-muted" dir="auto">
        {fileName ?? t.noFile}
      </span>
      </div>

      {status ? (
        <p role="status" className="text-xs text-ink-muted">
          {status}
        </p>
      ) : null}

      {haveDocument && !status ? (
        <div className="flex flex-wrap items-center gap-3">
          <p role="status" className="text-xs font-medium text-success-ink">
            {hasPending && fileName
              ? t.ready(fileName)
              : fileName
                ? t.uploaded(fileName)
                : t.onFile}{" "}
            {t.replace}
          </p>
          {canView && !hasPending ? (
            <span className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => openDocument("view")}
                disabled={linking}
                className="font-medium text-brand-ink underline-offset-4 hover:underline disabled:opacity-60"
              >
                {linking ? "…" : t.view}
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
                {t.download}
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
        title={t.yourDocument}
        kind={previewKind(key)}
        onClose={closePreview}
      />
    </div>
  );
}
