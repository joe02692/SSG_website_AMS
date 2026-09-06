"use client";

import { useActionState, useId } from "react";
import { createInviteAction, type InviteState } from "@/app/members/actions";
import { INVITABLE_ROLES, ROLE_LABELS } from "@/lib/roles";
import { Field, inputClass } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { CopyButton } from "@/components/members/copy-button";

const initialState: InviteState = {};

export function InviteForm() {
  const [state, formAction, pending] = useActionState(
    createInviteAction,
    initialState,
  );
  const id = useId();

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger-line bg-danger-surface px-3 py-2.5 text-sm text-danger-ink"
        >
          {state.error}
        </p>
      ) : null}

      {state.code ? (
        <div
          role="status"
          className="rounded-lg border border-success-line bg-success-surface p-3"
        >
          <p className="text-sm text-success-ink">
            {state.notice}
          </p>
          <p className="mt-2 flex items-center gap-2">
            <code className="rounded bg-canvas px-2 py-1 font-mono text-sm font-semibold text-ink">
              {state.code}
            </code>
            <CopyButton text={state.code} />
          </p>
        </div>
      ) : null}

      <Field
        label="What kind of leader?"
        htmlFor={`${id}-grants`}
        hint="Both have the same access for now; the distinction is recorded for later."
      >
        <select
          id={`${id}-grants`}
          name="grantsRole"
          defaultValue="stage_leader"
          className={inputClass}
        >
          {INVITABLE_ROLES.map((value) => (
            <option key={value} value={value}>
              {ROLE_LABELS[value]}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Who is it for?"
        htmlFor={`${id}-note`}
        hint="Optional — helps you remember why the code exists."
      >
        <input
          id={`${id}-note`}
          name="note"
          type="text"
          maxLength={200}
          className={inputClass}
          placeholder="e.g. Ahmed, Cubs section"
        />
      </Field>

      <Field
        label="Expires"
        htmlFor={`${id}-expires`}
        hint="How long the code stays redeemable. Accounts created with it are permanent."
      >
        <select
          id={`${id}-expires`}
          name="expiresDays"
          defaultValue="7"
          className={inputClass}
        >
          <option value="7">In 7 days</option>
          <option value="30">In 30 days</option>
          <option value="90">In 90 days</option>
          <option value="">Never</option>
        </select>
      </Field>

      <SubmitButton pending={pending} pendingLabel="Creating…">
        Create invite code
      </SubmitButton>
    </form>
  );
}
