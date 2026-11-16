"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import {
  deleteEventItemAction,
  saveEventItemAction,
  type EventsFormState,
} from "@/app/admin/events-actions";
import { Field, inputClass } from "@/components/ui/field";
import { useT } from "@/lib/i18n/client";
import { compressImage } from "@/lib/compress-image";

export type AdminEvent = {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  locationAr: string;
  locationEn: string;
  /** "YYYY-MM-DDTHH:mm", Cairo time. */
  startsAt: string;
  endsAt: string;
  published: boolean;
  photo: string | null;
  /** One line worked out on the server: "Sat 21 Nov, 9:00 am". */
  when: string;
  status: "draft" | "upcoming" | "past";
};

const BLANK: AdminEvent = {
  id: "",
  titleAr: "",
  titleEn: "",
  descriptionAr: "",
  descriptionEn: "",
  locationAr: "",
  locationEn: "",
  startsAt: "",
  endsAt: "",
  published: true,
  photo: null,
  when: "",
  status: "upcoming",
};

/** The Admin page's "Events" section: the list, plus add / edit / delete. */
export function EventsManager({ events }: { events: AdminEvent[] }) {
  const t = useT().features.adminEvents;
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="mt-4 space-y-3">
      {editing === "new" ? (
        <EventForm event={BLANK} onClose={() => setEditing(null)} />
      ) : (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="rounded-md bg-forest px-4 py-2 text-sm font-bold text-cream transition hover:opacity-90"
        >
          + {t.add}
        </button>
      )}

      {events.length === 0 ? <p className="text-sm text-ink-muted">{t.none}</p> : null}

      <ul className="space-y-3">
        {events.map((event) =>
          editing === event.id ? (
            <li key={event.id}>
              <EventForm event={event} onClose={() => setEditing(null)} />
            </li>
          ) : (
            <li
              key={event.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-raised p-3"
            >
              {event.photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- our own already-sized WebP
                <img src={event.photo} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
              ) : (
                <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-lg bg-forest text-xl text-sun">
                  ★
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">
                  <bdi>{event.titleAr}</bdi>
                  {event.titleEn ? (
                    <span className="text-ink-muted">
                      {" · "}
                      <bdi>{event.titleEn}</bdi>
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-ink-muted">{event.when}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  event.status === "draft"
                    ? "bg-warning-surface text-warning-ink"
                    : event.status === "past"
                      ? "bg-surface text-ink-muted"
                      : "bg-success-surface text-success-ink"
                }`}
              >
                {t.status[event.status]}
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(event.id)}
                  className="rounded-md border-2 border-line px-3 py-1 text-sm font-semibold text-ink transition hover:border-leaf"
                >
                  {t.edit}
                </button>
                <DeleteButton id={event.id} title={event.titleAr} />
              </span>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function DeleteButton({ id, title }: { id: string; title: string }) {
  const t = useT().features.adminEvents;
  const [state, action, pending] = useActionState<EventsFormState, FormData>(deleteEventItemAction, {});
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t.deleteQuestion(title))) return;
          const data = new FormData();
          data.set("id", id);
          startTransition(() => action(data));
        }}
        className="rounded-md border-2 border-danger-line px-3 py-1 text-sm font-semibold text-danger-ink transition hover:bg-danger-surface disabled:opacity-60"
      >
        {pending ? "…" : t.delete}
      </button>
      {state.error ? (
        <span role="alert" className="w-full text-sm text-danger-ink">
          {state.error}
        </span>
      ) : null}
    </>
  );
}

function EventForm({ event, onClose }: { event: AdminEvent; onClose: () => void }) {
  const t = useT().features.adminEvents;
  const [state, action, pending] = useActionState<EventsFormState, FormData>(saveEventItemAction, {});
  const [preparing, setPreparing] = useState(false);
  const [preview, setPreview] = useState<string | null>(event.photo);
  const photoRef = useRef<HTMLInputElement>(null);
  const isNew = !event.id;

  // A saved event closes the form (the list above refreshes with it).
  useEffect(() => {
    if (state.savedId) onClose();
  }, [state.savedId, onClose]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const file = photoRef.current?.files?.[0];
    if (file) {
      setPreparing(true);
      data.set("photo", await compressImage(file, 1600));
      setPreparing(false);
    } else {
      data.delete("photo");
    }
    startTransition(() => action(data));
  }

  const id = event.id || "new";
  const busy = pending || preparing;

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-xl border-2 border-leaf bg-surface-raised p-5 sm:p-6">
      <h3 className="text-lg font-semibold text-forest">{isNew ? t.addTitle : t.editTitle}</h3>
      {event.id ? <input type="hidden" name="id" value={event.id} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t.titleAr} htmlFor={`ev-${id}-title-ar`} error={state.field === "title_ar" ? state.error : undefined}>
          <input id={`ev-${id}-title-ar`} name="title_ar" dir="rtl" lang="ar" maxLength={120} required defaultValue={event.titleAr} className={inputClass} />
        </Field>
        <Field label={t.titleEn} htmlFor={`ev-${id}-title-en`} hint={t.englishHint}>
          <input id={`ev-${id}-title-en`} name="title_en" dir="ltr" lang="en" maxLength={120} defaultValue={event.titleEn} className={inputClass} />
        </Field>
        <Field label={t.descriptionAr} htmlFor={`ev-${id}-desc-ar`}>
          <textarea id={`ev-${id}-desc-ar`} name="description_ar" dir="rtl" lang="ar" rows={4} maxLength={2000} defaultValue={event.descriptionAr} className={inputClass} />
        </Field>
        <Field label={t.descriptionEn} htmlFor={`ev-${id}-desc-en`} hint={t.englishHint}>
          <textarea id={`ev-${id}-desc-en`} name="description_en" dir="ltr" lang="en" rows={4} maxLength={2000} defaultValue={event.descriptionEn} className={inputClass} />
        </Field>
        <Field label={t.locationAr} htmlFor={`ev-${id}-loc-ar`}>
          <input id={`ev-${id}-loc-ar`} name="location_ar" dir="rtl" lang="ar" maxLength={160} defaultValue={event.locationAr} className={inputClass} />
        </Field>
        <Field label={t.locationEn} htmlFor={`ev-${id}-loc-en`} hint={t.englishHint}>
          <input id={`ev-${id}-loc-en`} name="location_en" dir="ltr" lang="en" maxLength={160} defaultValue={event.locationEn} className={inputClass} />
        </Field>
        <Field label={t.startsAt} htmlFor={`ev-${id}-starts`} hint={t.cairoHint} error={state.field === "starts_at" ? state.error : undefined}>
          <input id={`ev-${id}-starts`} name="starts_at" type="datetime-local" dir="ltr" required defaultValue={event.startsAt} className={`${inputClass} rtl:text-right`} />
        </Field>
        <Field label={t.endsAt} htmlFor={`ev-${id}-ends`} hint={t.endsHint} error={state.field === "ends_at" ? state.error : undefined}>
          <input id={`ev-${id}-ends`} name="ends_at" type="datetime-local" dir="ltr" defaultValue={event.endsAt} className={`${inputClass} rtl:text-right`} />
        </Field>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview / our own WebP
          <img src={preview} alt="" className="h-24 w-36 rounded-lg object-cover" />
        ) : null}
        <div className="min-w-0 flex-1 space-y-2">
          <Field label={t.photo} htmlFor={`ev-${id}-photo`} hint={t.photoHint} error={state.field === "photo" ? state.error : undefined}>
            <input
              ref={photoRef}
              id={`ev-${id}-photo`}
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                setPreview(file ? URL.createObjectURL(file) : event.photo);
              }}
              className="block w-full text-sm text-ink file:me-3 file:rounded-md file:border-0 file:bg-forest file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-cream"
            />
          </Field>
          {event.photo ? (
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" name="remove_photo" className="size-4 accent-forest" />
              {t.removePhoto}
            </label>
          ) : null}
        </div>
      </div>

      <label className="flex items-start gap-3">
        <input type="checkbox" name="published" defaultChecked={event.published} className="mt-1 size-5 shrink-0 accent-forest" />
        <span>
          <span className="block font-display text-base font-medium text-brand-ink">{t.published}</span>
          <span className="text-xs text-ink-subtle">{t.publishedHint}</span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="rounded-md bg-forest px-5 py-2 text-sm font-bold text-cream transition hover:opacity-90 disabled:opacity-60">
          {busy ? t.saving : t.save}
        </button>
        <button type="button" onClick={onClose} className="rounded-md border-2 border-line px-4 py-1.5 text-sm font-semibold text-ink-muted transition hover:border-leaf">
          {t.cancel}
        </button>
        <p aria-live="polite" className="text-sm">
          {state.error && !state.field ? <span role="alert" className="text-danger-ink">{state.error}</span> : null}
        </p>
      </div>
    </form>
  );
}
