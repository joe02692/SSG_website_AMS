"use client";

import { useActionState, useId } from "react";
import {
  updateProfileAction,
  type ProfileState,
} from "@/app/dashboard/profile/actions";
import { Field, inputClass } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ProfileState = {};

export function ProfileForm({ fullName }: { fullName: string }) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    initialState,
  );
  const id = useId();

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.notice ? (
        <p
          role="status"
          className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm text-brand-900 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-200"
        >
          {state.notice}
        </p>
      ) : null}

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
        >
          {state.error}
        </p>
      ) : null}

      <Field
        label="Full name"
        htmlFor={`${id}-name`}
        hint="This is how you appear to leaders in the members list."
        error={state.fieldErrors?.fullName}
      >
        <input
          id={`${id}-name`}
          name="fullName"
          type="text"
          autoComplete="name"
          required
          maxLength={120}
          defaultValue={fullName}
          className={inputClass}
        />
      </Field>

      <SubmitButton pending={pending} pendingLabel="Saving…">
        Save changes
      </SubmitButton>
    </form>
  );
}
