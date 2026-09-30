"use client";

import { useT } from "@/lib/i18n/client";

/** The design's primary action: full-width forest bar, cream bold label. */
export function SubmitButton({
  pending,
  children,
  pendingLabel,
}: {
  pending: boolean;
  children: React.ReactNode;
  pendingLabel?: string;
}) {
  const t = useT();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-forest px-4 py-3
                 font-display text-lg text-cream transition hover:opacity-90
                 disabled:cursor-not-allowed disabled:opacity-70 sm:text-xl"
    >
      {pending ? (pendingLabel ?? t.chrome.working) : children}
    </button>
  );
}
