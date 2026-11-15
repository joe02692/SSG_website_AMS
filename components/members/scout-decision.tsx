"use client";

import { startTransition, useActionState } from "react";
import { reviewScoutAction, type ReviewState } from "@/app/dashboard/stage/review-actions";
import { useT } from "@/lib/i18n/client";

/** Approve / Reject for one waiting scout. Rejecting asks first. */
export function ScoutDecision({ id, name }: { id: string; name: string }) {
  const t = useT().features.scoutApproval;
  const [state, action, pending] = useActionState<ReviewState, FormData>(reviewScoutAction, {});

  function decide(decision: "approved" | "rejected") {
    if (decision === "rejected" && !window.confirm(t.rejectQuestion(name))) return;
    const data = new FormData();
    data.set("id", id);
    data.set("decision", decision);
    startTransition(() => action(data));
  }

  return (
    <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-dashed border-line pt-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => decide("approved")}
        className="rounded-md bg-forest px-4 py-2 text-sm font-bold text-cream transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "…" : t.approve}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => decide("rejected")}
        className="rounded-md border-2 border-danger-line px-4 py-1.5 text-sm font-semibold text-danger-ink transition hover:bg-danger-surface disabled:opacity-60"
      >
        {t.reject}
      </button>
      <span aria-live="polite" className="text-sm">
        {state.error ? <span role="alert" className="text-danger-ink">{state.error}</span> : null}
        {!state.error && state.notice ? <span className="text-success-ink">{state.notice}</span> : null}
      </span>
    </div>
  );
}
