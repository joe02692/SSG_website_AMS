"use client";

import { useId, useRef, useState, useTransition } from "react";
import { checkDetailsAction, type DetailsState } from "@/app/onboarding/actions";
import { MAX_ANSWER_LENGTH, type Question } from "@/lib/onboarding";
import { Field, inputClass } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { DocumentField, type DocumentController } from "@/components/onboarding/document-field";
import { useT } from "@/lib/i18n/client";

const OTHER = "__other";

/**
 * A list of choices plus "Other", which opens a box to write anything
 * (academic year). The answer travels in one hidden input under the
 * question's id, so the server sees a plain string either way.
 */
function ChoiceOther({
  fieldId,
  question,
  defaultValue,
  chooseOne,
  ...aria
}: {
  fieldId: string;
  question: Question;
  defaultValue: string;
  chooseOne: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-errormessage"?: string;
}) {
  const options = question.options ?? [];
  const known = options.some((option) => option.value === defaultValue);
  const [choice, setChoice] = useState(known ? defaultValue : defaultValue ? OTHER : "");
  const [other, setOther] = useState(known ? "" : defaultValue);
  const value = choice === OTHER ? other.trim() : choice;

  return (
    <div className="space-y-2">
      <input type="hidden" name={question.id} value={value} />
      <select
        id={fieldId}
        value={choice}
        onChange={(event) => setChoice(event.target.value)}
        className={inputClass}
        {...aria}
      >
        <option value="">{question.placeholder ?? chooseOne}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        <option value={OTHER}>{question.otherLabel ?? "Other"}</option>
      </select>
      {choice === OTHER ? (
        <input
          type="text"
          value={other}
          onChange={(event) => setOther(event.target.value)}
          maxLength={50}
          dir="auto"
          aria-label={question.otherLabel ?? question.label}
          placeholder={question.otherPlaceholder}
          className={inputClass}
          {...aria}
        />
      ) : null}
    </div>
  );
}

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
  checkAction = checkDetailsAction,
  hidden,
  childId,
}: {
  action: Action;
  /** Checks every answer before a new document uploads (default: own details). */
  checkAction?: Action;
  /** Extra fields sent with the form, e.g. which child is being edited. */
  hidden?: Record<string, string>;
  /** Set when a parent edits a child: View/Download fetch that child's document. */
  childId?: string;
  questions: Question[];
  /** Existing answers, so the profile page can prefill. */
  answers?: Record<string, string>;
  submitLabel: string;
  pendingLabel: string;
}) {
  const [state, setState] = useState<DetailsState>({});
  const [pending, startTransition] = useTransition();
  const [checking, setChecking] = useState(false);
  const id = useId();
  const all = useT();
  const chooseOne = all.account.onboarding.chooseOne;
  const documents = useRef<DocumentController | null>(null);
  const documentName = questions.find((q) => q.type === "file")?.id;

  /**
   * Sent by hand rather than with <form action>, for two reasons:
   *  • React empties a form after its action runs, which wiped every answer
   *    whenever the server found one mistake. Now everything stays as typed
   *    and only the wrong answer is marked.
   *  • A newly chosen document must not reach Backblaze until every other
   *    answer is right. So: check everything first (checkDetailsAction),
   *    upload only if that passes, then save.
   */
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const doc = documents.current;
      if (documentName && doc?.hasPending()) {
        setChecking(true);
        data.set(`${documentName}__pending`, "1");
        const check = await checkAction({}, data);
        setChecking(false);
        if (!check.ok) {
          setState(check);
          return;
        }
        const uploaded = await doc.upload();
        if (uploaded.error || !uploaded.key) {
          setState({
            fieldErrors: { [documentName]: uploaded.error ?? all.account.documents.couldNotStart },
          });
          return;
        }
        data.set(documentName, uploaded.key);
        data.delete(`${documentName}__pending`);
      }
      setState(await action({}, data));
    });
  }

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
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {hidden
        ? Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}
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
                // Remount when the saved key changes (the save action files
                // the upload under a new name), so the hidden input never
                // resubmits the temporary upload key.
                key={defaultValue}
                fieldId={fieldId}
                name={question.id}
                required={question.required}
                existingPath={defaultValue || undefined}
                controller={documents}
                childId={childId}
              />
            ) : question.type === "choice-other" ? (
              <ChoiceOther
                fieldId={fieldId}
                question={question}
                defaultValue={defaultValue}
                chooseOne={chooseOne}
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
                  {question.placeholder ?? chooseOne}
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
                dir="auto"
                className={inputClass}
              />
            ) : (
              <input
                id={fieldId}
                name={question.id}
                type={question.type ?? "text"}
                // Phone numbers and IDs are digits read left to right in
                // Arabic too; everything else follows what is typed.
                dir={
                  question.type === "tel" || question.id === "national_id"
                    ? "ltr"
                    : question.type === "date" || question.type === "number"
                      ? undefined
                      : "auto"
                }
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
                className={`${inputClass} ${
                  question.type === "tel" || question.id === "national_id" ? "rtl:text-right" : ""
                }`}
              />
            )}
          </Field>
        );
      })}

      <SubmitButton
        pending={pending}
        pendingLabel={checking ? all.account.documents.checking : pendingLabel}
      >
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
