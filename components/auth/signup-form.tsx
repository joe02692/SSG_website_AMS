"use client";

import { useActionState, useId, useState } from "react";
import Link from "next/link";
import { signUpAction, type AuthState } from "@/app/auth/actions";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/roles";
import { Field, inputClass } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: AuthState = {};

/** scout and parent are self-serve; leader is gated behind an invite code. */
const CHOICES = ["scout", "parent", "leader"] as const;

export function SignupForm() {
  const [state, formAction, pending] = useActionState(
    signUpAction,
    initialState,
  );
  const [role, setRole] = useState<(typeof CHOICES)[number]>("scout");
  const id = useId();

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.notice ? (
        <p
          role="status"
          className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm text-brand-900"
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

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-ink">
          How are you joining?
        </legend>
        <div className="grid gap-2">
          {CHOICES.map((choice) => (
            <label
              key={choice}
              className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition ${
                role === choice
                  ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-500/30"
                  : "border-line bg-surface-raised hover:border-brand-300"
              }`}
            >
              <input
                type="radio"
                name="role"
                value={choice}
                checked={role === choice}
                onChange={() => setRole(choice)}
                className="mt-0.5 size-4 accent-brand-600"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">
                  {ROLE_LABELS[choice]}
                  {choice === "leader" ? (
                    <span className="ml-2 rounded bg-accent-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-accent-600">
                      Invite only
                    </span>
                  ) : null}
                </span>
                <span className="block text-xs text-ink-subtle">
                  {ROLE_DESCRIPTIONS[choice]}
                </span>
              </span>
            </label>
          ))}
        </div>
        {state.fieldErrors?.role ? (
          <p className="text-xs font-medium text-red-600">
            {state.fieldErrors.role}
          </p>
        ) : null}
      </fieldset>

      <Field
        label="Full name"
        htmlFor={`${id}-name`}
        error={state.fieldErrors?.fullName}
      >
        <input
          id={`${id}-name`}
          name="fullName"
          type="text"
          autoComplete="name"
          required
          className={inputClass}
          placeholder="Yara Hassan"
        />
      </Field>

      <Field
        label="Email address"
        htmlFor={`${id}-email`}
        error={state.fieldErrors?.email}
      >
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

      <Field
        label="Password"
        htmlFor={`${id}-password`}
        hint="At least 10 characters."
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

      {role === "leader" ? (
        <Field
          label="Leader invite code"
          htmlFor={`${id}-invite`}
          hint="Ask an existing group leader for a code."
          error={state.fieldErrors?.inviteCode}
        >
          <input
            id={`${id}-invite`}
            name="inviteCode"
            type="text"
            autoComplete="off"
            spellCheck={false}
            className={`${inputClass} font-mono uppercase`}
            placeholder="ELSALAM-XXXX-XXXX"
          />
        </Field>
      ) : null}

      <SubmitButton pending={pending} pendingLabel="Creating account…">
        Create account
      </SubmitButton>

      <p className="text-center text-sm text-ink-muted">
        Already registered?{" "}
        <Link
          href="/login"
          className="font-medium text-brand-700 underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
