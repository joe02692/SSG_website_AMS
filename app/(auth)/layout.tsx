import type { ReactNode } from "react";
import { SiteShell } from "@/components/site-shell";

/**
 * Sign in, sign up, forgot and reset password.
 *
 * The design gives these the full site header and footer — the same bar as
 * the homepage, not a stripped-down one — with the form sitting directly on
 * the cream, no card around it, in a 480px column.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <SiteShell>
      <div className="px-4 pb-11 pt-8 sm:px-5 sm:pt-9">
        <div className="mx-auto w-full max-w-[480px]">{children}</div>
      </div>
    </SiteShell>
  );
}
