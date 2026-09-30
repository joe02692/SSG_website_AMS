"use client";

import { useActionState, useId } from "react";
import { updatePasswordAction, type AuthState } from "@/app/auth/actions";
import { Field, inputClass } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { useT } from "@/lib/i18n/client";

const initialState: AuthState = {};

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(
    updatePasswordAction,
    initialState,
  );
  const id = useId();
  const t = useT().auth.reset;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger-line bg-danger-surface px-3 py-2.5 text-sm text-danger-ink"
        >
          {state.error}
        </p>
      ) : null}

      <Field
        label={t.newPassword}
        htmlFor={`${id}-password`}
        hint={t.newPasswordHint}
        error={state.fieldErrors?.password}
      >
        <input
          id={`${id}-password`}
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className={inputClass}
        />
      </Field>

      <Field
        label={t.confirm}
        htmlFor={`${id}-confirm`}
        error={state.fieldErrors?.confirmPassword}
      >
        <input
          id={`${id}-confirm`}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className={inputClass}
        />
      </Field>

      <SubmitButton pending={pending} pendingLabel={t.pending}>
        {t.submit}
      </SubmitButton>
    </form>
  );
}
