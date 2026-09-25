"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

/**
 * The slide-in menu from the design, for screens narrower than 768px.
 *
 * A client component only because it has to open and close. Its contents are
 * passed in as children, so the links — and the signed-in / signed-out state,
 * which needs the session — are still rendered on the server.
 *
 * Closes on: the × button, a tap on the dimmed overlay, Escape, and any link
 * or button inside it. That last one matters in Next.js — a <Link> changes the
 * page without a reload, so without it the menu would stay open on top of the
 * page you just navigated to.
 */
export function MobileMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    // Stop the page scrolling underneath the open panel.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
        className="grid size-10 place-items-center rounded-md bg-leaf"
      >
        <span aria-hidden className="flex flex-col gap-[5px]">
          <span className="block h-[3px] w-6 rounded-sm bg-cream" />
          <span className="block h-[3px] w-6 rounded-sm bg-cream" />
          <span className="block h-[3px] w-6 rounded-sm bg-cream" />
        </span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[60] bg-forest/50"
          />
          <div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="on-dark fixed inset-y-0 right-0 z-[61] flex w-[min(100%,20rem)] flex-col bg-forest p-6 text-cream"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a, button[type=submit]")) {
                setOpen(false);
              }
            }}
          >
            <h2 className="text-[22px] text-sun">Menu</h2>
            <button
              type="button"
              aria-label="Close menu"
              autoFocus
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 grid size-10 place-items-center text-[28px] leading-none text-cream"
            >
              ×
            </button>
            <nav aria-label="Main" className="mt-10 flex flex-col gap-1">
              {children}
            </nav>
          </div>
        </>
      ) : null}
    </div>
  );
}
