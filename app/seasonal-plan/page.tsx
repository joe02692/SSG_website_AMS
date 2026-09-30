import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { PageBanner } from "@/components/page-banner";
import { ConstructionSticker } from "@/components/construction-sticker";
import { requireRole } from "@/lib/dal";
import { STAFF_ROLES } from "@/lib/roles";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getT()).pages.seasonal;
  return { title: t.metaTitle, description: t.metaDescription, robots: { index: false } };
}

/**
 * The season plan, for leaders and staff only (see claude/feature-backlog.md
 * for what goes here). Scouts are sent to their dashboard, visitors to the
 * login page.
 */
export default async function SeasonalPlanPage() {
  await requireRole(...STAFF_ROLES);
  const t = (await getT()).pages.seasonal;

  return (
    <SiteShell>
      <PageBanner title={t.title} eyebrow={t.eyebrow}>
        {t.intro}
      </PageBanner>

      <section className="mx-auto flex w-[calc(100%-40px)] max-w-[640px] flex-col items-center py-14 text-center sm:py-20">
        <ConstructionSticker top={t.stickerTop} bottom={t.stickerBottom} />
        <h2 className="mt-8 text-[clamp(22px,4vw,28px)] leading-tight text-maroon">
          {t.heading}
        </h2>
        <p className="mt-2 max-w-md text-[15px] leading-relaxed text-ink-muted">
          {t.body}
        </p>
        <Link
          href="/dashboard"
          className="mt-6 rounded-md bg-forest px-6 py-2.5 text-sm font-bold text-cream transition hover:opacity-90"
        >
          {t.back}
        </Link>
      </section>
    </SiteShell>
  );
}
