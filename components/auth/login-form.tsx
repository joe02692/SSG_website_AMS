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
          className="rounded-lg border border-danger-line bg-danger-surface px-3 py-2.5 text-sm text-danger-ink"
        >
          {state.error}
        </p>
      ) : null}

      <Field label="Email Address" htmlFor={`${id}-email`}>
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
          placeholder="Your password"
        />
      </Field>

      <p className="-mt-3 text-right">
        <Link
          href="/forgot-password"
          className="text-[13px] font-medium text-maroon underline underline-offset-2 hover:opacity-75"
        >
          Forgot password?
        </Link>
      </p>

      <div className="pt-3">
        <SubmitButton pending={pending} pendingLabel="Logging in…">
          Log in
        </SubmitButton>
      </div>

      <p className="text-center font-display text-[15px] font-medium text-brand-ink">
        New to the group?{" "}
        <Link
          href="/signup"
          className="text-maroon underline underline-offset-4 hover:opacity-75"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
