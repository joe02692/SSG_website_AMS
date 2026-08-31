"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  getDocumentUrlAction,
  type DocumentLinkState,
} from "@/app/members/scouts/actions";

const initialState: DocumentLinkState = {};

/**
 * Requests a signed URL for one scout's document and opens it.
 *
 * The link is minted on click and lives for 60 seconds — nothing viewable
 * sits in the page source, so a screenshot of the HTML is worthless.
 */
export function ViewDocumentButton({ path }: { path: string }) {
  const [state, formAction, pending] = useActionState(
    getDocumentUrlAction,
    initialState,
  );
  const opened = useRef<string | null>(null);

  useEffect(() => {
    if (state.url && opened.current !== state.url) {
      opened.current = state.url;
      window.open(state.url, "_blank", "noopener,noreferrer");
    }
  }, [state.url]);

  return (
    <form action={formAction}>
      <input type="hidden" name="path" value={path} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs font-medium text-brand-700 underline-offset-4 hover:underline disabled:opacity-60 dark:text-brand-300"
      >
        {pending ? "Opening…" : "View"}
      </button>
      {state.error ? (
        <span role="alert" className="ml-2 text-xs text-red-600">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
