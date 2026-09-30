"use client";

import { useActionState, useId, useState } from "react";
import Link from "next/link";
import { signUpAction, type AuthState } from "@/app/auth/actions";
import type { Role } from "@/lib/roles";
import { useT } from "@/lib/i18n/client";
import { SCOUT_STAGES } from "@/lib/onboarding";
import { Field, inputClass } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: AuthState = {};

/**
 * scout is self-serve; leader creates a REQUEST that a head admin approves;
 * parent is shown but not open yet. The `disabled` flag is a UI convenience
 * only — signUpAction rejects a parent signup server-side.
 */
const CHOICES: {
  value: Role;
  badge: "comingSoon" | "needsApproval" | null;
  disabled: boolean;
}[] = [
  { value: "scout", badge: null, disabled: false },
  { value: "parent", badge: "comingSoon", disabled: true },
  { value: "leader", badge: "needsApproval", disabled: false },
];

export function SignupForm() {
  const [state, formAction, pending] = useActionState(
    signUpAction,
    initialState,
  );
  const [role, setRole] = useState<Role>("scout");
  const id = useId();
  const all = useT();
  const t = all.auth.signup;
  const stageNames = all.stages;

  return (
    <form action={formAction} className="space-y-4" noValidate>
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

      <fieldset className="pb-4">
        <legend className="mb-2 font-display text-base font-medium text-brand-ink">
          {t.areYou}
        </legend>
        <div className="grid gap-2">
          {CHOICES.map((choice) => {
            const selected = role === choice.value;
            return (
              <label
                key={choice.value}
                // The radio itself is visually hidden (the whole card is the
                // target, as in the design), so the card has to show keyboard
                // focus on the radio's behalf — has-[:focus-visible].
                className={`relative flex min-h-[60px] items-center rounded-xl px-4 py-2.5 transition
                  has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-forest sm:px-[18px] ${
                  choice.disabled
                    ? "cursor-not-allowed border-2 border-[#6b706d] text-[#6b706d]"
                    : selected
                      ? "cursor-pointer border-[3px] border-leaf bg-leaf/20 text-forest"
                      : "cursor-pointer border-2 border-leaf text-brand-ink hover:bg-leaf/5"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={choice.value}
                  checked={selected}
                  disabled={choice.disabled}
                  onChange={() => setRole(choice.value)}
                  className="sr-only"
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <strong className="font-display text-base font-medium leading-tight sm:text-lg">
                      {choice.value === "leader" ? t.leader : all.roles.labels[choice.value]}
                    </strong>
                    {choice.badge ? (
                      <span
                        className={`inline-flex min-h-[25px] items-center rounded-md px-2 py-0.5 text-[11px] font-medium text-white ${
                          choice.disabled ? "bg-[#5f6461]" : "bg-forest"
                        }`}
                      >
                        {t[choice.badge]}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-xs font-medium leading-snug">
                    {choice.value === "leader"
                      ? t.leaderDescription
                      : all.roles.descriptions[choice.value]}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        {state.fieldErrors?.role ? (
          <p className="mt-2 text-xs font-medium text-danger-ink">
            {state.fieldErrors.role}
          </p>
        ) : null}
      </fieldset>

      <Field
        label={t.fullName}
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
          placeholder={t.fullNamePlaceholder}
        />
      </Field>

      <Field
        label={t.email}
        htmlFor={`${id}-email`}
        error={state.fieldErrors?.email}
      >
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          required
          dir="ltr"
          className={`${inputClass} rtl:text-right`}
          placeholder="you@example.com"
        />
      </Field>

      <Field
        label={t.password}
        htmlFor={`${id}-password`}
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
          placeholder={t.passwordPlaceholder}
        />
      </Field>

      {role === "leader" ? (
        <>
          <Field
            label={t.whichStage}
            htmlFor={`${id}-stage`}
            hint={t.whichStageHint}
            error={state.fieldErrors?.requestedStage}
          >
            <select
              id={`${id}-stage`}
              name="requestedStage"
              defaultValue=""
              className={inputClass}
            >
              <option value="">{t.chooseStage}</option>
              {SCOUT_STAGES.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stageNames[stage.value as keyof typeof stageNames] ?? stage.label}
                </option>
              ))}
            </select>
          </Field>

          <p className="rounded-xl border-2 border-line bg-surface-raised px-4 py-3 text-sm text-ink-muted">
            {t.lockedNote}
          </p>
        </>
      ) : null}

      <div className="pt-3">
      <SubmitButton
        pending={pending}
        pendingLabel={role === "leader" ? t.sendingRequest : t.creatingAccount}
      >
        {role === "leader" ? t.sendRequest : t.createAccount}
      </SubmitButton>
      </div>

      <p className="text-center font-display text-[15px] font-medium text-brand-ink">
        {t.already}{" "}
        <Link
          href="/login"
          className="text-maroon underline underline-offset-4 hover:opacity-75"
        >
          {t.signIn}
        </Link>
      </p>
    </form>
  );
}
