"use client";

import { useActionState, useState } from "react";
import { confirmEmailAction, type ConfirmEmailState } from "@/app/admin/email-actions";
import { useT } from "@/lib/i18n/client";
import { fill } from "@/lib/i18n/fill";

const initialState: ConfirmEmailState = {};

/**
 * "Confirm email" for a member whose confirmation email never arrived.
 * Two steps like the other admin buttons: the first click asks.
 */
export function ConfirmEmailButton({ memberId, name }: { memberId: string; name: string }) {
  const [state, formAction, pending] = useActionState(confirmEmailAction, initialState);
  const [armed, setArmed] = useState(false);
  const t = useT().members.confirmEmail;

  if (state.notice) {
    return (
      <p role="status" className="text-end text-xs font-semibold text-success-ink">
        {state.notice}
      </p>
    );
  }

  if (!armed) {
    return (
      <div className="text-end">
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="rounded-md bg-sun px-2.5 py-1 text-xs font-bold text-forest transition hover:opacity-85"
        >
          {t.button}
        </button>
        {state.error ? (
          <p role="alert" className="mt-1 text-xs text-danger-ink">
            {state.error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex max-w-64 flex-col items-end gap-1 text-end">
      <input type="hidden" name="memberId" value={memberId} />
      <p className="text-xs text-ink">
        {fill(t.question, <span className="font-semibold" dir="auto">{name}</span>)}
      </p>
      <p className="text-xs text-ink-muted">{t.note}</p>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-forest px-2 py-1 text-xs font-semibold text-cream transition hover:opacity-90 disabled:opacity-70"
        >
          {pending ? t.working : t.yes}
        </button>
        <button type="button" onClick={() => setArmed(false)} className="text-xs font-medium text-ink-muted hover:text-ink">
          {t.cancel}
        </button>
      </div>
      {state.error ? (
        <p role="alert" className="text-xs text-danger-ink">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
