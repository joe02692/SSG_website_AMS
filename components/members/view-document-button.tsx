"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import {
  getDocumentUrlAction,
  type DocumentLinkState,
} from "@/app/members/scouts/actions";
import {
  DocumentPreview,
  previewKind,
} from "@/components/ui/document-preview";

const initialState: DocumentLinkState = {};

/**
 * View / Download for one scout's document.
 *
 * Both mint a signed URL on click — nothing viewable sits in the page source,
 * so a copy of the HTML is worthless and the link is dead within a minute.
 *
 * "View" opens the certificate in a modal on this page. It used to open a new
 * tab, which popup blockers ate: the window.open() ran after an await, so the
 * browser no longer counted it as a click. "Download" navigates to a URL
 * carrying Content-Disposition: attachment, which saves the file without
 * leaving the page.
 */
export function ViewDocumentButton({
  path,
  filename,
}: {
  path: string;
  filename: string;
}) {
  const [state, formAction, pending] = useActionState(
    getDocumentUrlAction,
    initialState,
  );
  // Whether the popup is open is *derived* from the action result, not mirrored
  // into state — the only thing we track is which URL the user has dismissed.
  // Each click mints a new URL, so viewing the same file twice works.
  const [dismissed, setDismissed] = useState<string | null>(null);
  const navigated = useRef<string | null>(null);

  useEffect(() => {
    if (state.mode !== "download" || !state.url) return;
    if (navigated.current === state.url) return;
    navigated.current = state.url;
    window.location.href = state.url;
  }, [state.url, state.mode]);

  const previewUrl =
    state.mode === "view" && state.url && state.url !== dismissed
      ? state.url
      : null;

  const closePreview = useCallback(
    () => setDismissed(state.url ?? null),
    [state.url],
  );

  return (
    <>
      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="path" value={path} />
        <input type="hidden" name="filename" value={filename} />
        <button
          type="submit"
          name="mode"
          value="view"
          disabled={pending}
          className="text-xs font-medium text-brand-700 underline-offset-4 hover:underline disabled:opacity-60 dark:text-brand-300"
        >
          {pending ? "…" : "View"}
        </button>
        <span aria-hidden className="text-ink-subtle">
          ·
        </span>
        <button
          type="submit"
          name="mode"
          value="download"
          disabled={pending}
          className="text-xs font-medium text-brand-700 underline-offset-4 hover:underline disabled:opacity-60 dark:text-brand-300"
        >
          Download
        </button>
        {state.error ? (
          <span role="alert" className="text-xs text-red-600">
            {state.error}
          </span>
        ) : null}
      </form>

      <DocumentPreview
        url={previewUrl}
        title={filename}
        kind={previewKind(path)}
        onClose={closePreview}
      />
    </>
  );
}
