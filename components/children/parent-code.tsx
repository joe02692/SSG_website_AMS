"use client";

import { useActionState } from "react";
import { createLinkCodeAction, type ChildActionState } from "@/app/dashboard/children/actions";
import { useT } from "@/lib/i18n/client";

/** A scout makes a one-time code so a parent can follow their registration. */
export function ParentCode() {
  const t = useT().account.children;
  const [state, action, pending] = useActionState<ChildActionState, FormData>(
    (prev) => createLinkCodeAction(prev),
    {},
  );
  return (
    <form action={action} className="space-y-3">
      {state.code ? (
        <p className="flex flex-wrap items-baseline gap-3">
          <span className="text-sm text-ink-muted">{t.yourCode}</span>
          <bdi
            dir="ltr"
            className="rounded-lg bg-sun px-3 py-1.5 font-mono text-2xl font-bold tracking-[0.25em] text-forest select-all"
          >
            {state.code}
          </bdi>
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-forest px-5 py-2.5 font-bold text-cream transition hover:opacity-90 disabled:opacity-70"
      >
        {pending ? t.makingCode : state.code ? t.newCode : t.makeCode}
      </button>
      {state.error ? (
        <p role="alert" className="text-sm text-danger-ink">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
