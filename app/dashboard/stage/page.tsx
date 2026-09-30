import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { requireRole } from "@/lib/dal";
import { STAGE_ROLES } from "@/lib/roles";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).account.stage.metaTitle };
}

export default async function StagePage() {
  // Leader-only. proxy.ts already bounced anonymous visitors; this is the
  // check that actually enforces the role.
  const profile = await requireRole(...STAGE_ROLES);
  const t = (await getT()).account.stage;

  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href="/dashboard"
          className="text-sm text-brand-700 underline-offset-4 hover:underline"
        >
          <span aria-hidden className="inline-block rtl:-scale-x-100">←</span> {t.back}
        </Link>

        <h1 className="mt-3 text-2xl sm:text-[28px] font-semibold tracking-tight text-ink">
          {t.title}
        </h1>
        <p className="mt-2 text-ink-muted">
          {t.intro}
        </p>

        <div className="mt-8 rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <p className="text-lg font-medium text-ink">{t.empty}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            {t.emptyBody}
          </p>
          <p className="mt-4 text-xs text-ink-subtle">
            {t.signedInAs(profile.full_name)}
          </p>
        </div>
      </div>
    </SiteShell>
  );
}
