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
      <label
        htmlFor={htmlFor}
        className="block font-display text-base font-medium text-brand-ink"
      >
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
 * The design's input: a 2px leaf-green outline on the cream, rounded 12px.
 *
 * Leaf is 4.89:1 against the cream, comfortably over the 3:1 WCAG 1.4.11
 * needs for the edge of a control someone has to find — the old soft divider
 * colour was 1.23:1 and effectively invisible as an input border.
 *
 * min-h rather than a fixed height, because the same class dresses the
 * <textarea> in the registration form and a fixed 50px would crush it.
 */
export const inputClass =
  "w-full min-h-[46px] rounded-xl border-2 border-line-strong bg-surface-raised px-4 py-2.5 " +
  "text-sm font-medium text-ink placeholder:text-leaf outline-none transition " +
  "hover:border-brand-700 " +
  "focus:border-forest focus:ring-4 focus:ring-leaf/15 " +
  "aria-[invalid=true]:border-danger-solid aria-[invalid=true]:ring-danger-solid/20 " +
  "disabled:cursor-not-allowed disabled:opacity-60";
