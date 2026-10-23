"use client";

import { startTransition, useActionState } from "react";
import { saveEventAction, type EventFormState } from "@/app/admin/event-actions";
import { Field, inputClass } from "@/components/ui/field";
import { useT } from "@/lib/i18n/client";

export type EventDefaults = {
  enabled: boolean;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  /** "YYYY-MM-DDTHH:mm", Cairo time. */
  startsAt: string;
};

/**
 * The Admin page's event countdown form: on/off, title and description in
 * both languages, and the start date and time (Cairo).
 */
export function EventSettings({
  defaults,
  status,
}: {
  defaults: EventDefaults;
  /** One line describing what visitors see right now, worked out on the server. */
  status: string;
}) {
  const t = useT().members.event;
  const [state, formAction, pending] = useActionState<EventFormState, FormData>(
    saveEventAction,
    {},
  );

  return (
    // Submitted by hand rather than with action={…}: React resets a form
    // after an action runs, which would wipe what was typed whenever the
    // server answers with an error.
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => formAction(data));
      }}
      className="mt-4 space-y-5 rounded-xl border border-line bg-surface-raised p-5 sm:p-6">
      <p className="rounded-lg bg-surface px-3 py-2 text-sm text-ink-muted">{status}</p>

      <div className="flex items-start gap-3">
        <input
          id="event-enabled"
          name="enabled"
          type="checkbox"
          defaultChecked={defaults.enabled}
          aria-describedby="event-enabled-hint"
          className="mt-1 size-5 shrink-0 accent-forest"
        />
        <div>
          <label htmlFor="event-enabled" className="font-display text-base font-medium text-brand-ink">
            {t.show}
          </label>
          <p id="event-enabled-hint" className="text-xs text-ink-subtle">
            {t.showHint}
          </p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={t.titleAr}
          htmlFor="event-title-ar"
          error={state.field === "title_ar" ? state.error : undefined}
        >
          <input
            id="event-title-ar"
            name="title_ar"
            dir="rtl"
            lang="ar"
            maxLength={80}
            defaultValue={defaults.titleAr}
            className={inputClass}
          />
        </Field>
        <Field label={t.titleEn} htmlFor="event-title-en" hint={t.englishHint}>
          <input
            id="event-title-en"
            name="title_en"
            dir="ltr"
            lang="en"
            maxLength={80}
            defaultValue={defaults.titleEn}
            className={inputClass}
          />
        </Field>
        <Field label={t.descriptionAr} htmlFor="event-description-ar">
          <textarea
            id="event-description-ar"
            name="description_ar"
            dir="rtl"
            lang="ar"
            rows={2}
            maxLength={200}
            defaultValue={defaults.descriptionAr}
            className={inputClass}
          />
        </Field>
        <Field label={t.descriptionEn} htmlFor="event-description-en" hint={t.englishHint}>
          <textarea
            id="event-description-en"
            name="description_en"
            dir="ltr"
            lang="en"
            rows={2}
            maxLength={200}
            defaultValue={defaults.descriptionEn}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="sm:max-w-xs">
        <Field
          label={t.startsAt}
          htmlFor="event-starts-at"
          hint={t.startsAtHint}
          error={state.field === "starts_at" ? state.error : undefined}
        >
          <input
            id="event-starts-at"
            name="starts_at"
            type="datetime-local"
            dir="ltr"
            defaultValue={defaults.startsAt}
            className={`${inputClass} rtl:text-right`}
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-forest px-6 py-2.5 font-bold text-cream transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? t.saving : t.save}
        </button>
        <p aria-live="polite" className="text-sm">
          {state.notice ? <span className="font-medium text-brand-800">{state.notice}</span> : null}
          {state.error && !state.field ? (
            <span role="alert" className="font-medium text-danger-ink">{state.error}</span>
          ) : null}
        </p>
      </div>
    </form>
  );
}
