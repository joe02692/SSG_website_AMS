"use client";

import { useActionState, useId } from "react";
import Link from "next/link";
import { requestPasswordResetAction, type AuthState } from "@/app/auth/actions";
import { Field, inputClass } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: AuthState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );
  const id = useId();

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.notice ? (
        <p
          role="status"
          className="rounded-lg border border-success-line bg-success-surface px-3 py-2.5 text-sm text-success-ink"
        >
          {state.notice}
        </p>
      ) : null}

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger-line bg-danger-surface px-3 py-2.5 text-sm text-danger-ink"
        >
          {state.error}
        </p>
      ) : null}

      <Field label="Email address" htmlFor={`${id}-email`}>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
          placeholder="you@example.com"
        />
      </Field>

      <SubmitButton pending={pending} pendingLabel="Sending…">
        Email me a reset link
      </SubmitButton>

      <p className="text-center text-sm text-ink-muted">
        Remembered it?{" "}
        <Link
          href="/login"
          className="font-medium text-brand-ink underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
