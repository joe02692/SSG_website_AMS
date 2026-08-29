"use client";

import { useActionState, useState } from "react";
import { deleteMemberAction, type DeleteState } from "@/app/members/actions";

const initialState: DeleteState = {};

/**
 * Two-step delete: the first click reveals a confirm/cancel pair rather than
 * firing a native confirm() dialog. Deletion is irreversible, so a stray click
 * on a crowded table shouldn't be enough to trigger it.
 */
export function DeleteMemberButton({
  memberId,
  name,
}: {
  memberId: string;
  name: string;
}) {
  const [state, formAction, pending] = useActionState(
    deleteMemberAction,
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
      <input type="hidden" name="memberId" value={memberId} />
      <p className="text-xs text-ink-muted">
        Delete <span className="font-medium text-ink">{name}</span> for good?
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
