"use client";

import { useActionState, useId } from "react";
import Link from "next/link";
import { signInAction, type AuthState } from "@/app/auth/actions";
import { Field, inputClass } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: AuthState = {};

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction, pending] = useActionState(
    signInAction,
    initialState,
  );
  const id = useId();

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {redirectTo ? (
        <input type="hidden" name="redirectTo" value={redirectTo} />
      ) : null}

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
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

      <Field label="Password" htmlFor={`${id}-password`}>
        <input
          id={`${id}-password`}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </Field>

      <SubmitButton pending={pending} pendingLabel="Signing in…">
        Sign in
      </SubmitButton>

      <p className="text-center text-sm text-ink-muted">
        New to the group?{" "}
        <Link
          href="/signup"
          className="font-medium text-brand-700 underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
