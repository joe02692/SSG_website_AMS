"use client";

import { useActionState, useState } from "react";
import { changeRoleAction, type ReviewState } from "@/app/members/actions";
import { ASSIGNABLE_ROLES, ROLE_LABELS, type Role } from "@/lib/roles";

const initialState: ReviewState = {};

/**
 * Changes an existing member's role from the members table.
 *
 * Collapsed to a link until used. A role dropdown sitting open on every row of
 * a long table invites a mis-click that silently promotes somebody, and the
 * change takes effect immediately with no confirm step.
 */
export function ChangeRole({
  memberId,
  name,
  current,
}: {
  memberId: string;
  name: string;
  current: Role;
}) {
  const [state, formAction, pending] = useActionState(
    changeRoleAction,
    initialState,
  );
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="text-right">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs font-medium text-ink-muted underline-offset-4 hover:text-ink hover:underline"
        >
          Change role
        </button>
        {state.notice ? (
          <p role="status" className="mt-1 text-xs text-success-ink">
            {state.notice}
          </p>
        ) : null}
        {state.error ? (
          <p role="alert" className="mt-1 text-xs text-danger-ink">
            {state.error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center justify-end gap-2">
      <input type="hidden" name="memberId" value={memberId} />
      <select
        name="role"
        defaultValue={
          (ASSIGNABLE_ROLES as readonly string[]).includes(current)
            ? current
            : "stage_leader"
        }
        aria-label={`New role for ${name}`}
        className="rounded-lg border border-line-strong bg-surface-raised px-2 py-1 text-xs text-ink"
      >
        {ASSIGNABLE_ROLES.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-70"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs font-medium text-ink-muted hover:text-ink"
      >
        Cancel
      </button>
      {state.error ? (
        <p role="alert" className="w-full text-right text-xs text-danger-ink">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
