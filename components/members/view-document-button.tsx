"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  getDocumentUrlAction,
  type DocumentLinkState,
} from "@/app/members/scouts/actions";

const initialState: DocumentLinkState = {};

/**
 * View / Download for one scout's document.
 *
 * Both mint a signed URL on click and open it — nothing viewable sits in the
 * page source, so a screenshot of the HTML is worthless and the link is dead
 * within a minute. "Download" asks Supabase for a Content-Disposition header
 * so the browser saves the file rather than rendering it.
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
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (state.url && handled.current !== state.url) {
      handled.current = state.url;
      // The download flag is baked into the URL itself, so opening it either
      // shows the file or saves it, depending on which button was pressed.
      window.open(state.url, "_blank", "noopener,noreferrer");
    }
  }, [state.url]);

  return (
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
        View
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
        {pending ? "…" : "Download"}
      </button>
      {state.error ? (
        <span role="alert" className="text-xs text-red-600">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
