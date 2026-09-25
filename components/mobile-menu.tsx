"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { LIGHT_DISMISS, lightDismissFallback } from "@/components/ui/dialog-utils";

/**
 * The slide-in menu for screens narrower than 1024px — a native modal <dialog>.
 *
 * Using the platform's dialog rather than a hand-built overlay gets several
 * things for free that the earlier version had to fake or didn't do at all:
 * focus is trapped inside while it's open and returned to the ☰ button when it
 * closes, Escape closes it, the page behind is inert to screen readers, and it
 * renders in the top layer above everything. A tap on the dimmed backdrop
 * closes it too (`closedby="any"`, with a fallback for Safari).
 *
 * Its contents arrive as children, so the links — and the signed-in state,
 * which needs the session — are still rendered on the server.
 */
export function MobileMenu({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    return dialog ? lightDismissFallback(dialog) : undefined;
  }, []);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-haspopup="dialog"
        onClick={() => ref.current?.showModal()}
        className="grid size-10 place-items-center rounded-md bg-leaf transition hover:bg-brand-500"
      >
        <span aria-hidden className="flex flex-col gap-[5px]">
          <span className="block h-[3px] w-6 rounded-sm bg-cream" />
          <span className="block h-[3px] w-6 rounded-sm bg-cream" />
          <span className="block h-[3px] w-6 rounded-sm bg-cream" />
        </span>
      </button>

      <dialog
        ref={ref}
        {...LIGHT_DISMISS}
        aria-label="Menu"
        className="menu-sheet on-dark bg-forest p-0 text-cream"
        // Any link or sign-out button inside closes the sheet. In Next.js a
        // <Link> changes page without a reload, so without this the menu
        // would stay open over the page you just went to.
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a, button[type=submit]")) {
            ref.current?.close();
          }
        }}
      >
        <div className="flex h-full flex-col p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl text-sun">Menu</h2>
            <form method="dialog">
              <button
                aria-label="Close menu"
                className="grid size-10 place-items-center rounded-md text-[28px] leading-none text-cream transition hover:bg-cream/10"
              >
                ×
              </button>
            </form>
          </div>
          <nav aria-label="Main" className="mt-8 flex flex-col gap-1">
            {children}
          </nav>
          <p className="mt-auto border-t border-cream/15 pt-5 text-sm text-cream/70">
            <span lang="ar" dir="rtl" className="block font-display">
              مجموعة السلام الكشفية
            </span>
            Character, Service &amp; Friendship
          </p>
        </div>
      </dialog>
    </div>
  );
}
