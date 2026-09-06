import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

type ControlProps = {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-errormessage"?: string;
};

/**
 * Label + hint + error around one form control.
 *
 * The wiring matters more than it looks. This component previously computed an
 * `aria-describedby` string and then set it on a wrapper <div> as
 * `data-described-by` — a data attribute, which assistive technology ignores
 * completely. Every hint ("11 digits, starting 01") and every validation error
 * was rendered on screen and announced to nobody. A blind member filling in the
 * registration form would hear "Personal phone, edit text" and be told nothing
 * about the format or about what they got wrong.
 *
 * So the ids are now attached to the control itself by cloning it. Cloning is
 * the right trade here: the alternative is making every caller thread three
 * aria props through by hand, which is the kind of thing that gets forgotten on
 * the next form somebody adds.
 */
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
  const hintId = hint ? `${htmlFor}-hint` : null;
  const errorId = error ? `${htmlFor}-error` : null;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  // Only one control per Field, so `Children.only` semantics are what we want —
  // but tolerate anything unexpected rather than throwing in a member's face.
  const child = Children.toArray(children)[0];
  const control =
    isValidElement(child) && describedBy
      ? cloneElement(child as ReactElement<ControlProps>, {
          "aria-describedby": describedBy,
          ...(error
            ? { "aria-invalid": true, "aria-errormessage": errorId ?? undefined }
            : {}),
        })
      : children;

  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {hint ? (
        <p id={hintId ?? undefined} className="text-xs text-ink-subtle">
          {hint}
        </p>
      ) : null}
      {control}
      {error ? (
        <p
          id={errorId ?? undefined}
          role="alert"
          className="text-xs font-medium text-danger-ink"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * `border-line-strong`, not `border-line`. The soft divider colour is 1.23:1
 * against white — invisible as an input edge, and below the 3:1 that WCAG
 * 1.4.11 requires for the boundary of a control someone has to find and click.
 * Dividers and controls are different jobs and now have different tokens.
 */
export const inputClass =
  "w-full rounded-lg border border-line-strong bg-surface-raised px-3 py-2 text-sm text-ink " +
  "placeholder:text-ink-subtle shadow-sm outline-none transition " +
  "hover:border-brand-500 " +
  "focus:border-brand-600 focus:ring-2 focus:ring-brand-500/30 " +
  "aria-[invalid=true]:border-danger-solid aria-[invalid=true]:ring-danger-solid/25 " +
  "disabled:cursor-not-allowed disabled:opacity-60";
