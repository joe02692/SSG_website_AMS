import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { EventComingSoon } from "@/components/event-coming-soon";

/**
 * Public-facing chrome. Deliberately a component rather than a route-group
 * layout: `app/page.tsx` already owns "/", and adding `app/(site)/page.tsx`
 * would declare that route twice and fail the build.
 */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <EventComingSoon />
      <main id="main" className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
