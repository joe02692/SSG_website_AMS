import Image from "next/image";
import type { ReactNode } from "react";
import { SiteShell } from "@/components/site-shell";
import { FOUNDED, HERO_SLIDES } from "@/lib/site-content";

/**
 * Sign in, sign up, forgot and reset password.
 *
 * Full site header and footer, as in the design. On large screens the form
 * shares the page with a photo of the group — the same one that opens the
 * homepage — so signing in feels like arriving somewhere, not filling in a
 * form in a void. On phones the photo is dropped and the form is the page.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const photo = HERO_SLIDES[0];
  return (
    <SiteShell>
      <div className="lg:grid lg:min-h-[calc(100dvh-5rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <aside
          aria-hidden
          className="on-dark relative hidden overflow-hidden bg-forest lg:block"
        >
          <Image
            src={photo.src}
            alt=""
            fill
            placeholder="blur"
            sizes="50vw"
            className="object-cover object-[center_35%] opacity-70"
          />
          <div className="absolute inset-0 bg-linear-to-t from-forest via-forest/40 to-forest/10" />
          <div className="absolute inset-x-10 bottom-12 text-cream">
            <p lang="ar" dir="rtl" className="w-fit font-display text-5xl text-sun">
              كن مستعدًا
            </p>
            <p className="mt-2 font-display text-3xl">Be prepared.</p>
            <p className="mt-4 max-w-sm text-cream/85">
              Four hundred scouts, leaders and families — one group, since{" "}
              {FOUNDED}.
            </p>
          </div>
        </aside>

        <div className="px-4 pb-12 pt-8 sm:px-5 sm:pt-10 lg:flex lg:items-center lg:justify-center lg:px-12 lg:py-14">
          <div className="mx-auto w-full max-w-[480px]">{children}</div>
        </div>
      </div>
    </SiteShell>
  );
}
