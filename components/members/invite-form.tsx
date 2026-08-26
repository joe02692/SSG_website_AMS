"use client";

import { useActionState, useId } from "react";
import { createInviteAction, type InviteState } from "@/app/members/actions";
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
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
        >
          {state.error}
        </p>
      ) : null}

      {state.code ? (
        <div
          role="status"
          className="rounded-lg border border-brand-200 bg-brand-50 p-3 dark:border-brand-800 dark:bg-brand-950"
        >
          <p className="text-sm text-brand-900 dark:text-brand-200">
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

      <Field label="Expires" htmlFor={`${id}-expires`}>
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
