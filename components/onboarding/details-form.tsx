"use client";

import { useActionState, useId, useState } from "react";
import type { DetailsState } from "@/app/onboarding/actions";
import { MAX_ANSWER_LENGTH, type Question } from "@/lib/onboarding";
import { Field, inputClass } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { DocumentField } from "@/components/onboarding/document-field";

const initialState: DetailsState = {};

type Action = (
  state: DetailsState,
  formData: FormData,
) => Promise<DetailsState>;

export function DetailsForm({
  action,
  questions,
  answers,
  submitLabel,
  pendingLabel,
}: {
  action: Action;
  questions: Question[];
  /** Existing answers, so the profile page can prefill. */
  answers?: Record<string, string>;
  submitLabel: string;
  pendingLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const id = useId();

  // Only the answers that other questions branch on are tracked. Everything
  // else stays uncontrolled, so typing in a text box does not re-render the
  // whole form on every keystroke.
  const [watched, setWatched] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const q of questions) {
      if (q.visibleWhen) seed[q.visibleWhen.question] = answers?.[q.visibleWhen.question] ?? "";
    }
    return seed;
  });
  const isWatched = (questionId: string) => questionId in watched;

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

      {questions.map((question) => {
        const fieldId = `${id}-${question.id}`;
        const defaultValue = answers?.[question.id] ?? "";

        // A graduate is not asked for an academic year. The same pairing is a
        // CHECK constraint in migration 0014 — this only spares people from
        // filling in a box the database would reject.
        if (
          question.visibleWhen &&
          !question.visibleWhen.equals.includes(
            watched[question.visibleWhen.question] ?? "",
          )
        ) {
          return null;
        }

        return (
          <Field
            key={question.id}
            label={question.label}
            htmlFor={fieldId}
            hint={question.hint}
            error={state.fieldErrors?.[question.id]}
          >
            {question.type === "file" ? (
              <DocumentField
                fieldId={fieldId}
                name={question.id}
                required={question.required}
                existingPath={defaultValue || undefined}
              />
            ) : question.type === "checkbox" ? (
              // Repeated inputs under one name: FormData.getAll() on the
              // server returns every ticked value, which is what the M:N
              // junction table needs.
              <fieldset className="grid gap-2 sm:grid-cols-2">
                <legend className="sr-only">{question.label}</legend>
                {(question.options ?? []).map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg border
                               border-line bg-surface-raised px-3 py-2 text-sm text-ink
                               transition hover:border-brand-300"
                  >
                    <input
                      type="checkbox"
                      name={question.id}
                      value={option.value}
                      defaultChecked={defaultValue.split(",").includes(option.value)}
                      className="size-4 accent-brand-600"
                    />
                    {option.label}
                  </label>
                ))}
              </fieldset>
            ) : question.type === "select" ? (
              <select
                id={fieldId}
                name={question.id}
                required={question.required}
                defaultValue={defaultValue}
                onChange={
                  isWatched(question.id)
                    ? (event) =>
                        setWatched((prev) => ({
                          ...prev,
                          [question.id]: event.target.value,
                        }))
                    : undefined
                }
                className={inputClass}
              >
                <option value="">
                  {question.placeholder ?? "Choose one…"}
                </option>
                {(question.options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : question.type === "textarea" ? (
              <textarea
                id={fieldId}
                name={question.id}
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
                name={question.id}
                type={question.type ?? "text"}
                // maxLength is meaningless on date and number inputs, and on
                // date it breaks the native picker in some browsers.
                maxLength={
                  question.type === "date" || question.type === "number"
                    ? undefined
                    : MAX_ANSWER_LENGTH
                }
                min={question.min}
                max={question.max}
                required={question.required}
                defaultValue={defaultValue}
                placeholder={question.placeholder}
                onChange={
                  isWatched(question.id)
                    ? (event) =>
                        setWatched((prev) => ({
                          ...prev,
                          [question.id]: event.target.value,
                        }))
                    : undefined
                }
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
