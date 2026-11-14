"use client";

import { startTransition, useActionState } from "react";
import {
  freeSeatAction,
  hideLeaderProfileAction,
  saveStageInfoAction,
  type StageAdminState,
} from "@/app/admin/stages-actions";
import { Field, inputClass } from "@/components/ui/field";
import { useT } from "@/lib/i18n/client";

type Values = Record<string, string>;

const FIELDS = [
  { name: "promise", rows: 3, max: 1000 },
  { name: "about", rows: 4, max: 2000 },
  { name: "age_group", rows: 1, max: 120 },
  { name: "vision", rows: 3, max: 1000 },
  { name: "mission", rows: 3, max: 1000 },
] as const;

/** One stage's pop-up text, Arabic and English side by side. */
export function StageInfoForm({ stage, values }: { stage: string; values: Values }) {
  const t = useT().features.adminStages;
  const [state, action, pending] = useActionState<StageAdminState, FormData>(saveStageInfoAction, {});
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="space-y-4 p-4 sm:p-5"
    >
      <input type="hidden" name="stage" value={stage} />
      {FIELDS.map((field) => (
        <div key={field.name} className="grid gap-4 sm:grid-cols-2">
          {(["ar", "en"] as const).map((lang) => {
            const id = `si-${stage}-${field.name}-${lang}`;
            const label = `${t.fields[field.name]} (${lang === "ar" ? t.arabic : t.english})`;
            const common = {
              id,
              name: `${field.name}_${lang}`,
              dir: lang === "ar" ? "rtl" : "ltr",
              lang,
              maxLength: field.max,
              defaultValue: values[`${field.name}_${lang}`] ?? "",
              className: inputClass,
            } as const;
            return (
              <Field key={lang} label={label} htmlFor={id} hint={field.name === "age_group" && lang === "ar" ? t.ageHint : undefined}>
                {field.rows === 1 ? <input {...common} /> : <textarea {...common} rows={field.rows} />}
              </Field>
            );
          })}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md bg-forest px-5 py-2 text-sm font-bold text-cream transition hover:opacity-90 disabled:opacity-60">
          {pending ? t.saving : t.save}
        </button>
        <p aria-live="polite" className="text-sm">
          {state.error ? <span role="alert" className="text-danger-ink">{state.error}</span> : null}
          {!state.error && state.notice ? <span className="text-success-ink">{state.notice}</span> : null}
        </p>
      </div>
    </form>
  );
}

/** "Free this seat" / "Take off the site" — one small confirmed button. */
export function AdminLeaderButton({
  kind,
  stageId,
  profileId,
  label,
  question,
}: {
  kind: "free" | "hide";
  stageId?: number;
  profileId: string;
  label: string;
  question: string;
}) {
  const [state, action, pending] = useActionState<StageAdminState, FormData>(
    kind === "free" ? freeSeatAction : hideLeaderProfileAction,
    {},
  );
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(question)) return;
          const data = new FormData();
          data.set("profile_id", profileId);
          if (stageId !== undefined) data.set("stage_id", String(stageId));
          startTransition(() => action(data));
        }}
        className="rounded-md border-2 border-danger-line px-2.5 py-0.5 text-xs font-semibold text-danger-ink transition hover:bg-danger-surface disabled:opacity-60"
      >
        {pending ? "…" : label}
      </button>
      {state.error ? <span role="alert" className="text-xs text-danger-ink">{state.error}</span> : null}
    </span>
  );
}
