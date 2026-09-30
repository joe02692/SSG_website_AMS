"use client";

import { useActionState, useState } from "react";
import { changeRoleAction, type ReviewState } from "@/app/members/actions";
import { ASSIGNABLE_ROLES, type Role } from "@/lib/roles";
import { useT } from "@/lib/i18n/client";
import { StageAdminStage, type StageAdminsByStage } from "@/components/members/stage-admin-stage";

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
  currentStage = "",
  stageAdmins = {},
}: {
  memberId: string;
  name: string;
  current: Role;
  /** Their stage, if they are a stage admin now. */
  currentStage?: string;
  stageAdmins?: StageAdminsByStage;
}) {
  const [state, formAction, pending] = useActionState(
    changeRoleAction,
    initialState,
  );
  const [open, setOpen] = useState(false);
  const initialRole = (ASSIGNABLE_ROLES as readonly string[]).includes(current)
    ? current
    : "stage_leader";
  const [role, setRole] = useState<string>(initialRole);
  const [stage, setStage] = useState(currentStage);
  const all = useT();
  const t = all.members.controls;

  if (!open) {
    return (
      <div className="text-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs font-medium text-ink-muted underline-offset-4 hover:text-ink hover:underline"
        >
          {t.changeRole}
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
        value={role}
        onChange={(event) => setRole(event.target.value)}
        aria-label={t.newRoleFor(name)}
        className="rounded-lg border border-line-strong bg-surface-raised px-2 py-1 text-xs text-ink"
      >
        {ASSIGNABLE_ROLES.map((r) => (
          <option key={r} value={r}>
            {all.roles.labels[r]}
          </option>
        ))}
      </select>
      {role === "stage_admin" ? (
        <StageAdminStage
          memberId={memberId}
          name={name}
          value={stage}
          onChange={setStage}
          stageAdmins={stageAdmins}
        />
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-70"
      >
        {pending ? t.saving : t.save}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs font-medium text-ink-muted hover:text-ink"
      >
        {t.cancel}
      </button>
      {state.error ? (
        <p role="alert" className="w-full text-end text-xs text-danger-ink">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
