import type { ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  const describedBy = [
    hint ? `${htmlFor}-hint` : null,
    error ? `${htmlFor}-error` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-ink-subtle">
          {hint}
        </p>
      ) : null}
      <div data-described-by={describedBy || undefined}>{children}</div>
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-ink " +
  "placeholder:text-ink-subtle shadow-sm outline-none transition " +
  "focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 " +
  "disabled:cursor-not-allowed disabled:opacity-60";
