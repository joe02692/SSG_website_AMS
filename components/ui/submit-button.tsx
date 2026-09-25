"use client";

/** The design's primary action: full-width forest bar, cream Fustat label. */
export function SubmitButton({
  pending,
  children,
  pendingLabel = "Working…",
}: {
  pending: boolean;
  children: React.ReactNode;
  pendingLabel?: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-forest px-4 py-3
                 font-display text-lg text-cream transition hover:opacity-90
                 disabled:cursor-not-allowed disabled:opacity-70 sm:text-xl"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
