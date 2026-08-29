"use client";

import { useActionState, useId } from "react";
import type { DetailsState } from "@/app/onboarding/actions";
import { MAX_ANSWER_LENGTH, ONBOARDING_QUESTIONS } from "@/lib/onboarding";
import { Field, inputClass } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Profile } from "@/lib/dal";

const initialState: DetailsState = {};

type Action = (
  state: DetailsState,
  formData: FormData,
) => Promise<DetailsState>;

export function DetailsForm({
  action,
  profile,
  submitLabel,
  pendingLabel,
}: {
  action: Action;
  /** Existing answers, so the profile page can prefill. */
  profile?: Profile | null;
  submitLabel: string;
  pendingLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
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

      {ONBOARDING_QUESTIONS.map((question) => {
        const fieldId = `${id}-${question.column}`;
        const defaultValue = profile?.[question.column] ?? "";

        return (
          <Field
            key={question.column}
            label={question.label}
            htmlFor={fieldId}
            hint={question.hint}
            error={state.fieldErrors?.[question.column]}
          >
            {question.type === "textarea" ? (
              <textarea
                id={fieldId}
                name={question.column}
                rows={3}
                maxLength={MAX_ANSWER_LENGTH}
                required={question.required}
                defaultValue={defaultValue}
                placeholder={question.placeholder}
                className={inputClass}
              />
            ) : (
              <input
                id={fieldId}
                name={question.column}
                type={question.type ?? "text"}
                maxLength={MAX_ANSWER_LENGTH}
                required={question.required}
                defaultValue={defaultValue}
                placeholder={question.placeholder}
                className={inputClass}
              />
            )}
          </Field>
        );
      })}

      <SubmitButton pending={pending} pendingLabel={pendingLabel}>
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
