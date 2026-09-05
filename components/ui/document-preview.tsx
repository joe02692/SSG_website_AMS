"use client";

import { useEffect, useRef } from "react";

/**
 * A modal preview of one stored document — the birth certificate popup.
 *
 * Built on the native <dialog> element rather than a hand-rolled overlay,
 * because showModal() brings Esc-to-close, focus trapping and the ::backdrop
 * with it. Doing that by hand is how modals end up unreachable by keyboard.
 *
 * The URL handed in is a presigned Backblaze link that dies in 60 seconds.
 * That is fine while the dialog is open — the browser has already fetched the
 * bytes — but it means the URL must never be stored or rendered anywhere that
 * outlives the click.
 */
export function DocumentPreview({
  url,
  title,
  kind,
  onClose,
  onDownload,
  downloading,
}: {
  /** Presigned view URL, or null when nothing is open. */
  url: string | null;
  /** Shown in the header — usually the scout's name. */
  title: string;
  kind: "image" | "pdf";
  onClose: () => void;
  /** Omit to hide the download button. */
  onDownload?: () => void;
  downloading?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (url && !dialog.open) dialog.showModal();
    if (!url && dialog.open) dialog.close();
  }, [url]);

  // Esc and the close button both fire "close" — one exit path, so state can
  // never disagree with what's on screen.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={`Birth certificate — ${title}`}
      // Clicking the backdrop lands on the dialog itself; anything inside the
      // content div stops there, so only true backdrop clicks close it.
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
      className="m-auto max-h-[92vh] w-[min(92vw,900px)] rounded-2xl border border-line
                 bg-surface-raised p-0 text-ink shadow-2xl backdrop:bg-black/70
                 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{title}</p>
          <p className="text-xs text-ink-subtle">
            شهادة الميلاد — this link expires in about a minute.
          </p>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {onDownload ? (
            <button
              type="button"
              onClick={onDownload}
              disabled={downloading}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white
                         transition hover:bg-brand-700 disabled:opacity-60"
            >
              {downloading ? "…" : "Download"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink-muted
                       transition hover:border-brand-300 hover:text-ink"
          >
            Close
          </button>
        </div>
      </div>

      <div className="max-h-[calc(92vh-64px)] overflow-auto bg-canvas p-3">
        {url && kind === "image" ? (
          /* eslint-disable-next-line @next/next/no-img-element --
             next/image would need the B2 host in remotePatterns and would
             proxy a private document through our optimiser. A plain img keeps
             the file between the browser and Backblaze. */
          <img
            src={url}
            alt={`Birth certificate for ${title}`}
            className="mx-auto max-h-full w-auto rounded-lg"
          />
        ) : null}

        {url && kind === "pdf" ? (
          <iframe
            src={url}
            title={`Birth certificate for ${title}`}
            className="h-[70vh] w-full rounded-lg border border-line bg-white"
          />
        ) : null}
      </div>
    </dialog>
  );
}

/** Guesses how to render a stored file from its key. */
export function previewKind(key: string): "image" | "pdf" {
  return key.toLowerCase().endsWith(".pdf") ? "pdf" : "image";
}
