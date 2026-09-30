import Image from "next/image";
import type { ReactNode } from "react";
import { SiteShell } from "@/components/site-shell";
import { FOUNDED, GROUP_PHOTO } from "@/lib/site-content";
import { getT } from "@/lib/i18n/server";

/**
 * Sign in, sign up, forgot and reset password.
 *
 * Full site header and footer, as in the design. On large screens the form
 * shares the page with a photo of the group — the same one that opens the
 * homepage — so signing in feels like arriving somewhere, not filling in a
 * form in a void. On phones the photo is dropped and the form is the page.
 */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  const photo = GROUP_PHOTO;
  const t = (await getT()).auth;
  return (
    <SiteShell>
      <div className="lg:grid lg:min-h-[calc(100dvh-72px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <aside
          aria-hidden
          className="on-dark relative hidden bg-forest lg:block"
        >
          {/* The photo stays pinned to the screen while the form scrolls.
              Without this, the long sign-up form stretched the panel to
              ~1,700px tall, and filling that meant blowing a landscape photo
              up 3× — which is why it looked blurry. The photo itself is now
              3200px wide (from the original), and `sizes` asks for a copy as
              wide as the screen, since a landscape photo covering a tall panel
              is shown wider than the panel. */}
          <div className="sticky top-[72px] h-[calc(100dvh-72px)] overflow-hidden">
            <Image
              src={photo.src}
              alt=""
              fill
              placeholder="blur"
              sizes="(min-width: 1024px) 100vw, 1px"
              className="object-cover object-[50%_45%] opacity-80"
            />
            <div className="absolute inset-0 bg-linear-to-t from-forest via-forest/35 to-forest/5" />
            <div className="absolute inset-x-10 bottom-12 text-cream">
              <p className="font-display text-4xl font-bold text-sun">{t.layoutMotto}</p>
              <p className="mt-3 max-w-sm text-[15px] text-cream/85">
                {t.layoutBlurb(FOUNDED)}
              </p>
            </div>
          </div>
        </aside>

        <div className="px-4 pb-12 pt-8 sm:px-5 sm:pt-10 lg:flex lg:items-center lg:justify-center lg:px-12 lg:py-14">
          <div className="mx-auto w-full max-w-[480px]">{children}</div>
        </div>
      </div>
    </SiteShell>
  );
}
