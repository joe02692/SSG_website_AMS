"use client";

import { useActionState, useState } from "react";
import {
  createRecoveryLinkAction,
  type RecoveryLinkState,
} from "@/app/members/actions";

const initialState: RecoveryLinkState = {};

/**
 * Issues a one-time password-recovery link for one member.
 *
 * Two-step, like the delete button: the first click arms it. Handing out
 * access to someone else's account should not be one stray tap on a crowded
 * table.
 *
 * The link is shown once and never persisted anywhere. There is no "show it
 * again" — issuing a fresh one is a click, and a recovery link sitting in a
 * page you left open is a live key to a member's account.
 */
export function RecoveryLinkButton({
  memberId,
  name,
}: {
  memberId: string;
  name: string;
}) {
  const [state, formAction, pending] = useActionState(
    createRecoveryLinkAction,
    initialState,
  );
  const [armed, setArmed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!state.link) return;
    try {
      await navigator.clipboard.writeText(state.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context, or permission refused). The link
      // is on screen and selectable, so this is a convenience, not the path.
      setCopied(false);
    }
  }

  if (state.link) {
    return (
      <div className="space-y-1.5 text-left">
        <p className="text-xs text-ink-muted">
          One-time link for{" "}
          <span className="font-medium text-ink">{state.forName}</span>. Send it
          to them directly — it works once, then expires.
        </p>
        <textarea
          readOnly
          rows={2}
          value={state.link}
          onFocus={(event) => event.currentTarget.select()}
          aria-label={`Recovery link for ${state.forName}`}
          className="w-full rounded-lg border border-line-strong bg-surface px-2 py-1.5
                     font-mono text-[11px] text-ink"
        />
        <button
          type="button"
          onClick={copy}
          className="text-xs font-medium text-brand-ink underline-offset-4 hover:underline"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    );
  }

  if (!armed) {
    return (
      <div className="text-right">
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="text-xs font-medium text-ink-muted underline-offset-4 hover:text-ink hover:underline"
        >
          Reset password
        </button>
        {state.error ? (
          <p role="alert" className="mt-1 text-xs text-danger-ink">
            {state.error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="memberId" value={memberId} />
      <p className="text-xs text-ink-muted">
        Make a recovery link for{" "}
        <span className="font-medium text-ink">{name}</span>?
      </p>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand-600 px-2 py-1 text-xs font-semibold text-white
                     transition hover:bg-brand-700 disabled:opacity-70"
        >
          {pending ? "Creating…" : "Create link"}
        </button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          className="text-xs font-medium text-ink-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
      {state.error ? (
        <p role="alert" className="text-xs text-danger-ink">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
