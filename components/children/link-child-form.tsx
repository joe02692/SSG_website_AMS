"use client";

import { useActionState } from "react";
import { linkChildAction, type ChildActionState } from "@/app/dashboard/children/actions";
import { inputClass } from "@/components/ui/field";
import { useT } from "@/lib/i18n/client";

/** A parent types the 8-letter code their child made on their own dashboard. */
export function LinkChildForm() {
  const t = useT().account.children;
  const [state, action, pending] = useActionState<ChildActionState, FormData>(linkChildAction, {});
  return (
    <form action={action} className="space-y-2">
      <label htmlFor="link-code" className="block font-display text-base text-forest">
        {t.codeLabel}
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="link-code"
          name="code"
          required
          maxLength={12}
          autoComplete="off"
          dir="ltr"
          placeholder="ABCD2345"
          className={`${inputClass} max-w-48 font-mono uppercase tracking-widest`}
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-forest px-5 py-2.5 font-bold text-cream transition hover:opacity-90 disabled:opacity-70"
        >
          {pending ? t.linking : t.link}
        </button>
      </div>
      <p aria-live="polite" className="text-sm">
        {state.notice ? <span className="text-success-ink">{state.notice}</span> : null}
        {state.error ? <span role="alert" className="text-danger-ink">{state.error}</span> : null}
      </p>
    </form>
  );
}
