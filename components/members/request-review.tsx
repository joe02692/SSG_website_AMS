"use client";

import { useActionState, useState } from "react";
import {
  approveRequestAction,
  rejectRequestAction,
  type ReviewState,
} from "@/app/members/actions";
import { ASSIGNABLE_ROLES } from "@/lib/roles";
import { useT } from "@/lib/i18n/client";
import { fill } from "@/lib/i18n/fill";

const initialState: ReviewState = {};

/** Roles offered on approval. `scout` is for changing a role, not granting one. */
const APPROVAL_ROLES = ASSIGNABLE_ROLES.filter((role) => role !== "scout");

/**
 * Approve or reject one pending leader request.
 *
 * The role is chosen here rather than requested at signup, deliberately: the
 * applicant has no idea what "Site Admin" means in this system, and letting
 * someone nominate their own privileges is the mistake invite codes made in a
 * different shape.
 */
export function RequestReview({
  memberId,
  name,
}: {
  memberId: string;
  name: string;
}) {
  const [approveState, approve, approving] = useActionState(
    approveRequestAction,
    initialState,
  );
  const [rejectState, reject, rejecting] = useActionState(
    rejectRequestAction,
    initialState,
  );
  const [armed, setArmed] = useState(false);
  const all = useT();
  const t = all.members.controls;

  const error = approveState.error ?? rejectState.error;

  return (
    <div className="flex flex-col items-end gap-1.5">
      {armed ? (
        <form action={reject} className="flex flex-col items-end gap-1">
          <input type="hidden" name="memberId" value={memberId} />
          <p className="text-xs text-ink-muted">
            {fill(t.rejectQuestion, <span className="font-medium text-ink" dir="auto">{name}</span>)}
          </p>
          <p className="text-xs text-ink-subtle">
            {t.rejectNote}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={rejecting}
              className="rounded-md bg-danger-solid px-2 py-1 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-70"
            >
              {rejecting ? t.removing : t.yesReject}
            </button>
            <button
              type="button"
              onClick={() => setArmed(false)}
              className="text-xs font-medium text-ink-muted hover:text-ink"
            >
              {t.cancel}
            </button>
          </div>
        </form>
      ) : (
        <form action={approve} className="flex flex-wrap items-center justify-end gap-2">
          <input type="hidden" name="memberId" value={memberId} />
          <select
            name="role"
            defaultValue="stage_leader"
            aria-label={t.roleToGive(name)}
            className="rounded-lg border border-line-strong bg-surface-raised px-2 py-1 text-xs text-ink"
          >
            {APPROVAL_ROLES.map((role) => (
              <option key={role} value={role}>
                {all.roles.labels[role]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={approving}
            className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-70"
          >
            {approving ? t.approving : t.approve}
          </button>
          <button
            type="button"
            onClick={() => setArmed(true)}
            className="text-xs font-medium text-danger-ink underline-offset-4 hover:underline"
          >
            {t.reject}
          </button>
        </form>
      )}

      {error ? (
        <p role="alert" className="text-xs text-danger-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
