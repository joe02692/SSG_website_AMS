import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { DetailsForm } from "@/components/onboarding/details-form";
import { getCurrentProfile } from "@/lib/dal";
import { isParentRole } from "@/lib/roles";
import { CHILD_QUESTIONS } from "@/lib/onboarding";
import { checkChildAction, saveChildAction } from "@/app/onboarding/actions";
import { getLocale, getT } from "@/lib/i18n/server";
import { localizeQuestions } from "@/lib/i18n/onboarding";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).account.children.addTitle };
}

/** A parent registers a child (0025). The dashboard layout already ran onboarding. */
export default async function AddChildPage() {
  const profile = await getCurrentProfile();
  if (!isParentRole(profile?.role)) redirect("/dashboard");
  const t = (await getT()).account.children;
  const locale = await getLocale();

  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <Link href="/dashboard" className="text-sm text-brand-ink underline-offset-4 hover:underline">
          <span aria-hidden className="inline-block rtl:-scale-x-100">←</span> {t.back}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{t.addTitle}</h1>
        <p className="mt-2 text-ink-muted">{t.addIntro}</p>
        <div className="mt-8 rounded-2xl border border-line bg-surface-raised p-6">
          <DetailsForm
            action={saveChildAction}
            checkAction={checkChildAction}
            questions={localizeQuestions(CHILD_QUESTIONS, locale)}
            submitLabel={t.addSave}
            pendingLabel={t.saving}
          />
        </div>
      </div>
    </SiteShell>
  );
}
