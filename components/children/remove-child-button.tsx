"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { removeChildAction, type ChildActionState } from "@/app/dashboard/children/actions";
import { useT } from "@/lib/i18n/client";

/** Removes a child from the parent's account, after asking once. */
export function RemoveChildButton({
  childId,
  name,
  linked,
}: {
  childId: string;
  name: string;
  /** The child has their own login: only the link goes. */
  linked: boolean;
}) {
  const t = useT().account.children;
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [state, action, pending] = useActionState<ChildActionState, FormData>(
    async (prev, data) => {
      const result = await removeChildAction(prev, data);
      if (!result.error) router.push("/dashboard");
      return result;
    },
    {},
  );

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="text-sm font-medium text-danger-ink underline-offset-4 hover:underline"
      >
        {t.remove}
      </button>
    );
  }

  return (
    <form action={action} className="space-y-2 rounded-xl border border-danger-line bg-danger-surface p-4">
      <input type="hidden" name="childId" value={childId} />
      <p className="text-sm font-medium text-ink">{t.removeQuestion(name)}</p>
      <p className="text-xs text-ink-muted">{linked ? t.removeLinked : t.removeAdded}</p>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-danger-solid px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-70"
        >
          {pending ? t.removing : t.yesRemove}
        </button>
        <button type="button" onClick={() => setArmed(false)} className="text-sm text-ink-muted hover:text-ink">
          {t.cancel}
        </button>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-danger-ink">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
