import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { PageBanner } from "@/components/page-banner";
import { ConstructionSticker } from "@/components/construction-sticker";
import { requireRole } from "@/lib/dal";
import { STAFF_ROLES } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Seasonal Plan",
  description: "The season's plan for El-Salam leaders.",
  robots: { index: false },
};

/**
 * The season plan, for leaders and staff only (see claude/feature-backlog.md
 * for what goes here). Scouts are sent to their dashboard, visitors to the
 * login page.
 */
export default async function SeasonalPlanPage() {
  await requireRole(...STAFF_ROLES);

  return (
    <SiteShell>
      <PageBanner title="Seasonal Plan" eyebrow="Leaders only">
        Meetings, camps and activities for the season, stage by stage.
      </PageBanner>

      <section className="mx-auto flex w-[calc(100%-40px)] max-w-[640px] flex-col items-center py-14 text-center sm:py-20">
        <ConstructionSticker />
        <h2 className="mt-8 text-[clamp(22px,4vw,28px)] leading-tight text-maroon">
          We&apos;re still pitching this tent
        </h2>
        <p className="mt-2 max-w-md text-[15px] leading-relaxed text-ink-muted">
          The seasonal plan is under construction. Grab your toolbox and check
          back soon — no knots will be left untied.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 rounded-md bg-forest px-6 py-2.5 text-sm font-bold text-cream transition hover:opacity-90"
        >
          Back to my dashboard
        </Link>
      </section>
    </SiteShell>
  );
}
