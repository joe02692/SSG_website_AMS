"use client";

import { useActionState, useState } from "react";
import { deleteMemberAction, type DeleteState } from "@/app/members/actions";
import { useT } from "@/lib/i18n/client";
import { fill } from "@/lib/i18n/fill";

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
  const t = useT().members.controls;

  if (!armed) {
    return (
      <div className="text-end">
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="text-xs font-medium text-danger-ink underline-offset-4 hover:underline"
        >
          {t.delete}
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
        {fill(t.deleteQuestion, <span className="font-medium text-ink" dir="auto">{name}</span>)}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-danger-solid px-2 py-1 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-70"
        >
          {pending ? t.deleting : t.yesDelete}
        </button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          className="text-xs font-medium text-ink-muted hover:text-ink"
        >
          {t.cancel}
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
