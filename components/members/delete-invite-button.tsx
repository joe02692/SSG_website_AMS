"use client";

import { useActionState, useState } from "react";
import { deleteInviteAction, type DeleteState } from "@/app/members/actions";

const initialState: DeleteState = {};

/**
 * Two-step delete for an invite code.
 *
 * Used codes carry a heavier warning: their row is the only record of who
 * joined with which invite, and deleting it throws that away.
 */
export function DeleteInviteButton({
  code,
  used,
  usedByName,
}: {
  code: string;
  used: boolean;
  usedByName?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    deleteInviteAction,
    initialState,
  );
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <div className="text-right">
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="text-xs font-medium text-red-600 underline-offset-4 hover:underline"
        >
          Delete
        </button>
        {state.error ? (
          <p role="alert" className="mt-1 text-xs text-red-600">
            {state.error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="code" value={code} />
      <p className="text-right text-xs text-ink-muted">
        {used
          ? `Delete this record? ${usedByName ?? "A member"} joined with it — that link is lost.`
          : "Delete this unused code?"}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-70"
        >
          {pending ? "Deleting…" : "Yes, delete"}
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
        <p role="alert" className="text-xs text-red-600">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
