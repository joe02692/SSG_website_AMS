"use client";

import { useActionState, useId } from "react";
import Link from "next/link";
import { signInAction, type AuthState } from "@/app/auth/actions";
import { Field, inputClass } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { useT } from "@/lib/i18n/client";

const initialState: AuthState = {};

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction, pending] = useActionState(
    signInAction,
    initialState,
  );
  const id = useId();
  const t = useT().auth.login;

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

      <Field label={t.email} htmlFor={`${id}-email`}>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          required
          // Email addresses are left-to-right even in Arabic; aligned to the
          // start of the page so the box still reads as part of the form.
          dir="ltr"
          className={`${inputClass} rtl:text-right`}
          placeholder="you@example.com"
        />
      </Field>

      <Field label={t.password} htmlFor={`${id}-password`}>
        <input
          id={`${id}-password`}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
          placeholder={t.passwordPlaceholder}
        />
      </Field>

      <p className="-mt-3 text-end">
        <Link
          href="/forgot-password"
          className="text-[13px] font-medium text-maroon underline underline-offset-2 hover:opacity-75"
        >
          {t.forgot}
        </Link>
      </p>

      <div className="pt-3">
        <SubmitButton pending={pending} pendingLabel={t.pending}>
          {t.submit}
        </SubmitButton>
      </div>

      <p className="text-center font-display text-[15px] font-medium text-brand-ink">
        {t.newHere}{" "}
        <Link
          href="/signup"
          className="text-maroon underline underline-offset-4 hover:opacity-75"
        >
          {t.createAccount}
        </Link>
      </p>
    </form>
  );
}
