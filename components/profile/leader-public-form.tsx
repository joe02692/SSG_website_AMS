"use client";

import Link from "next/link";
import { startTransition, useActionState, useRef, useState } from "react";
import {
  saveLeaderProfileAction,
  type LeaderProfileState,
} from "@/app/dashboard/profile/leader-profile-actions";
import { Field, inputClass } from "@/components/ui/field";
import { Avatar } from "@/components/stages/stage-explorer";
import { useT } from "@/lib/i18n/client";
import { shrinkImage } from "@/lib/shrink-image";

type StageSeat = {
  code: string;
  name: string;
  mine: "leader" | "assistant" | "";
  leaderTakenBy: string | null;
  assistantTakenBy: string | null;
};

/**
 * "Your public profile" on /dashboard/profile (leaders only): photo, title
 * per stage, a short about, and the switch that shows it on the site.
 * Name, age, education and join year come from the registration details.
 */
export function LeaderPublicForm({
  id,
  name,
  photo,
  about,
  isPublic,
  stages,
  facts,
}: {
  id: string;
  name: string;
  photo: string | null;
  about: string;
  isPublic: boolean;
  stages: StageSeat[];
  /** Read-only lines shown from the registration details. */
  facts: { label: string; value: string }[];
}) {
  const t = useT().features.leaderForm;
  const [state, action, pending] = useActionState<LeaderProfileState, FormData>(saveLeaderProfileAction, {});
  const [preparing, setPreparing] = useState(false);
  const [preview, setPreview] = useState<string | null>(photo);
  const [aboutLength, setAboutLength] = useState(about.length);
  const photoRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const file = photoRef.current?.files?.[0];
    if (file) {
      setPreparing(true);
      data.set("photo", await shrinkImage(file, 900));
      setPreparing(false);
    } else {
      data.delete("photo");
    }
    startTransition(() => action(data));
  }

  const busy = pending || preparing;

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-2xl border border-line bg-surface-raised p-6">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={name} photo={preview} />
        <div className="min-w-0 flex-1 space-y-2">
          <Field label={t.photo} htmlFor="leader-photo" hint={t.photoHint} error={state.field === "photo" ? state.error : undefined}>
            <input
              ref={photoRef}
              id="leader-photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                setPreview(file ? URL.createObjectURL(file) : photo);
              }}
              className="block w-full text-sm text-ink file:me-3 file:rounded-md file:border-0 file:bg-forest file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-cream"
            />
          </Field>
          {photo ? (
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" name="remove_photo" className="size-4 accent-forest" />
              {t.removePhoto}
            </label>
          ) : null}
        </div>
      </div>

      <fieldset>
        <legend className="font-display text-base font-medium text-brand-ink">{t.titles}</legend>
        <p className="text-xs text-ink-subtle">{t.titlesHint}</p>
        {stages.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">{t.noStages}</p>
        ) : (
          <div className="mt-3 space-y-3">
            {stages.map((stage) => (
              <div key={stage.code} className="rounded-xl border border-line p-3">
                <p className="font-semibold text-forest">{stage.name}</p>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="radio" name={`title_${stage.code}`} value="" defaultChecked={stage.mine === ""} className="size-4 accent-forest" />
                    {t.titleNone}
                  </label>
                  <SeatOption code={stage.code} value="leader" label={t.titleLeader} takenBy={stage.leaderTakenBy} checked={stage.mine === "leader"} takenText={t.takenBy} />
                  <SeatOption code={stage.code} value="assistant" label={t.titleAssistant} takenBy={stage.assistantTakenBy} checked={stage.mine === "assistant"} takenText={t.takenBy} />
                </div>
              </div>
            ))}
          </div>
        )}
        {state.field === "titles" && state.error ? (
          <p role="alert" className="mt-2 text-sm text-danger-ink">
            {state.error}
          </p>
        ) : null}
      </fieldset>

      <Field label={t.about} htmlFor="leader-about" hint={t.aboutHint} error={state.field === "about" ? state.error : undefined}>
        <textarea
          id="leader-about"
          name="about"
          dir="auto"
          rows={5}
          maxLength={800}
          defaultValue={about}
          onChange={(e) => setAboutLength(e.currentTarget.value.length)}
          className={inputClass}
        />
      </Field>
      <p className="-mt-4 text-end text-xs text-ink-subtle tabular-nums">{aboutLength} / 800</p>

      {facts.length > 0 ? (
        <div className="rounded-xl bg-surface p-4">
          <p className="text-sm font-semibold text-ink">{t.fromDetails}</p>
          <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {facts.map((f) => (
              <div key={f.label} className="flex gap-2">
                <dt className="text-ink-muted">{f.label}:</dt>
                <dd className="font-medium text-ink">
                  <bdi>{f.value}</bdi>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <label className="flex items-start gap-3 rounded-xl border-2 border-leaf/50 bg-leaf/5 p-3">
        <input type="checkbox" name="is_public" defaultChecked={isPublic} className="mt-1 size-5 shrink-0 accent-forest" />
        <span>
          <span className="block font-display text-base font-medium text-brand-ink">{t.show}</span>
          <span className="text-xs text-ink-muted">{t.showHint}</span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="rounded-md bg-forest px-5 py-2 text-sm font-bold text-cream transition hover:opacity-90 disabled:opacity-60">
          {busy ? t.saving : t.save}
        </button>
        {isPublic ? (
          <Link href={`/leaders/${id}`} className="text-sm font-semibold text-brand-ink underline-offset-4 hover:underline">
            {t.viewProfile}
          </Link>
        ) : null}
        <p aria-live="polite" className="text-sm">
          {state.error && !state.field ? <span role="alert" className="text-danger-ink">{state.error}</span> : null}
          {!state.error && state.notice ? <span className="text-success-ink">{state.notice}</span> : null}
        </p>
      </div>
    </form>
  );
}

function SeatOption({
  code,
  value,
  label,
  takenBy,
  checked,
  takenText,
}: {
  code: string;
  value: "leader" | "assistant";
  label: string;
  takenBy: string | null;
  checked: boolean;
  takenText: (name: string) => string;
}) {
  return (
    <label className={`flex items-center gap-2 ${takenBy ? "text-ink-subtle" : ""}`}>
      <input type="radio" name={`title_${code}`} value={value} defaultChecked={checked} disabled={Boolean(takenBy)} className="size-4 accent-forest" />
      <span>
        {label}
        {takenBy ? <span className="ms-1 text-xs">({takenText(takenBy)})</span> : null}
      </span>
    </label>
  );
}
