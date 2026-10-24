import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { DetailsForm } from "@/components/onboarding/details-form";
import { RemoveChildButton } from "@/components/children/remove-child-button";
import { childAnswers, getCurrentProfile, getMyChild } from "@/lib/dal";
import { isParentRole } from "@/lib/roles";
import { CHILD_QUESTIONS, ageFromDateOfBirth } from "@/lib/onboarding";
import { checkChildAction, saveChildAction } from "@/app/onboarding/actions";
import { getLocale, getT } from "@/lib/i18n/server";
import { localizeQuestions } from "@/lib/i18n/onboarding";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).account.children.sectionTitle };
}

/** A parent views and edits one of their children (0025). */
export default async function ChildPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ added?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!isParentRole(profile?.role)) redirect("/dashboard");
  const { id } = await params;
  const { added } = await searchParams;
  // Only a child this parent looks after — anything else is simply not found.
  const child = await getMyChild(id);
  if (!child) notFound();

  const t = (await getT()).account.children;
  const locale = await getLocale();
  const linked = child.profile_id !== null;
  // A scout with their own login keeps their own name; it isn't edited here.
  const questions = linked ? CHILD_QUESTIONS.filter((q) => q.id !== "full_name") : CHILD_QUESTIONS;
  const age = ageFromDateOfBirth(child.date_of_birth);

  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <Link href="/dashboard" className="text-sm text-brand-ink underline-offset-4 hover:underline">
          <span aria-hidden className="inline-block rtl:-scale-x-100">←</span> {t.back}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
          <bdi>{t.editTitle(child.name)}</bdi>
        </h1>
        <p className="mt-2 text-ink-muted">
          {t.editIntro}
          {age !== null ? <> · {t.age(age)}</> : null}
          {linked ? <> · {t.linkedBadge}</> : null}
        </p>
        {added ? (
          <p
            role="status"
            className="mt-4 rounded-lg border border-success-line bg-success-surface px-3 py-2.5 text-sm text-success-ink"
          >
            {t.added}
          </p>
        ) : null}
        <div className="mt-8 rounded-2xl border border-line bg-surface-raised p-6">
          <DetailsForm
            action={saveChildAction}
            checkAction={checkChildAction}
            questions={localizeQuestions(questions, locale)}
            answers={childAnswers(child)}
            hidden={{ child_id: child.id }}
            childId={child.id}
            submitLabel={t.save}
            pendingLabel={t.saving}
          />
        </div>
        <div className="mt-6">
          <RemoveChildButton childId={child.id} name={child.name} linked={linked} />
        </div>
      </div>
    </SiteShell>
  );
}
