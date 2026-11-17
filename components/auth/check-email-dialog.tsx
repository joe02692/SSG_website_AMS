"use client";

import { useEffect, useRef } from "react";
import { useT } from "@/lib/i18n/client";

/** A webmail shortcut for the common providers; null for everything else. */
function webmailFor(email: string): { name: string; url: string } | null {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (domain === "gmail.com" || domain === "googlemail.com") return { name: "Gmail", url: "https://mail.google.com/" };
  if (/^(outlook|hotmail|live|msn)\.[a-z.]+$/.test(domain)) return { name: "Outlook", url: "https://outlook.live.com/mail/" };
  if (/^yahoo\.[a-z.]+$/.test(domain)) return { name: "Yahoo Mail", url: "https://mail.yahoo.com/" };
  if (domain === "icloud.com" || domain === "me.com") return { name: "iCloud Mail", url: "https://www.icloud.com/mail/" };
  return null;
}

/**
 * The big "go and confirm your email" pop-up shown right after signing up
 * (validation feedback, 17 Nov 2026): a small green line above the form was
 * too easy to miss, and people tried to sign in before confirming.
 *
 * A native modal <dialog>: it opens by itself, traps focus, and closes with
 * the button or Escape.
 */
export function CheckEmailDialog({ email, leader }: { email: string; leader: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useT().auth.signup;
  const webmail = webmailFor(email);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
      // Start at the top (the envelope and the address), not at the buttons.
      dialog.querySelector<HTMLElement>("h2")?.focus();
      dialog.scrollTop = 0;
    }
  }, [email]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="check-email-title"
      className="check-email m-auto max-h-[94dvh] w-[min(92vw,520px)] max-w-none overflow-y-auto rounded-3xl border-0 bg-surface-raised p-0 text-ink shadow-2xl backdrop:bg-forest/80 backdrop:backdrop-blur-sm"
    >
      <div className="relative bg-forest px-6 pb-7 pt-7 text-center text-cream">
        <span className="check-email-icon mx-auto grid size-20 place-items-center rounded-full bg-sun text-forest shadow-lg ring-8 ring-sun/25">
          <svg aria-hidden viewBox="0 0 48 48" className="size-12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
            <rect x="6" y="11" width="36" height="26" rx="4" />
            <path d="m7 13 17 13 17-13" />
          </svg>
        </span>
        <h2 id="check-email-title" tabIndex={-1} className="outline-none mt-4 text-[clamp(21px,5vw,28px)] leading-tight text-white">
          {t.checkTitle}
        </h2>
        <p className="mt-3 text-sm text-cream/85">{t.checkSent}</p>
        <p dir="ltr" className="mt-1 break-all text-lg font-bold text-sun">
          {email}
        </p>
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-sun" />
      </div>

      <div className="px-6 py-6">
        <ol className="space-y-3">
          {[t.checkStep1, t.checkStep2, t.checkStep3].map((step, i) => (
            <li key={step} className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-leaf font-display text-base font-bold text-white">
                {i + 1}
              </span>
              <span className="pt-1 font-semibold text-ink">{step}</span>
            </li>
          ))}
        </ol>

        <p className="mt-5 rounded-xl border-2 border-warning-line bg-warning-surface px-4 py-3 text-sm font-semibold text-warning-ink">
          {t.checkMustConfirm}
        </p>
        <p className="mt-3 text-sm text-ink-muted">{t.checkSpam}</p>
        {leader ? <p className="mt-2 text-sm text-ink-muted">{t.checkLeader}</p> : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          {webmail ? (
            <a
              href={webmail.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-xl bg-sun px-4 py-3 text-center font-bold text-forest transition hover:opacity-85"
            >
              {t.openMail(webmail.name)}
            </a>
          ) : null}
          <form method="dialog" className="flex-1">
            <button
              className="w-full rounded-xl bg-forest px-4 py-3 font-bold text-cream transition hover:opacity-90"
            >
              {t.checkGotIt}
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
}
