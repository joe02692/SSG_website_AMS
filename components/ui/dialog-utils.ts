/**
 * Helpers for the native <dialog>s (mobile menu, photo lightbox).
 */

/**
 * `closedby="any"` lets a click on the dimmed backdrop close a modal dialog.
 * React's types don't know the attribute yet, so it is spread in from here.
 */
export const LIGHT_DISMISS = { closedby: "any" } as Record<string, string>;

/**
 * Safari doesn't support `closedby` yet. There, a click whose target is the
 * <dialog> itself but which lands outside its box was a click on the backdrop,
 * so close it by hand. Returns a cleanup function; a no-op where native
 * support exists.
 */
export function lightDismissFallback(dialog: HTMLDialogElement): () => void {
  if ("closedBy" in HTMLDialogElement.prototype) return () => {};
  const onClick = (event: MouseEvent) => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    const inside =
      r.top <= event.clientY &&
      event.clientY <= r.bottom &&
      r.left <= event.clientX &&
      event.clientX <= r.right;
    if (!inside) dialog.close();
  };
  dialog.addEventListener("click", onClick);
  return () => dialog.removeEventListener("click", onClick);
}
