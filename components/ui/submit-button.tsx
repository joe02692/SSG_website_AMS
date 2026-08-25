"use client";

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
      className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5
                 text-sm font-semibold text-white shadow-sm transition
                 hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2
                 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
