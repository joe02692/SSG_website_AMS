import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import {
  requireUser,
  getCurrentProfile,
  getScoutDetails,
  getLeaderDetails,
  scoutAnswers,
  leaderAnswers,
} from "@/lib/dal";
import { ProfileForm } from "@/components/profile/profile-form";
import { DetailsForm } from "@/components/onboarding/details-form";
import { updateDetailsAction } from "@/app/onboarding/actions";
import {
  ageFromDateOfBirth,
  questionsForRole,
  usesScoutDetails,
} from "@/lib/onboarding";
import { getLocale, getT } from "@/lib/i18n/server";
import { localizeQuestions } from "@/lib/i18n/onboarding";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).account.profile.metaTitle };
}

export default async function ProfilePage() {
  const user = await requireUser();
  const all = await getT();
  const t = all.account.profile;
  const locale = await getLocale();

  // Both at once. The scout_details lookup used to be gated on the role, which
  // made it a third sequential round trip on the critical path for scouts —
  // who are almost everyone. getScoutDetails() only needs the user id and
  // already returns null for staff, who have no row, so firing it speculatively
  // costs one wasted lookup for a handful of accounts and saves a full hop for
  // the rest. Both are cache()d, so nothing is fetched twice.
  const [profile, scout, leader] = await Promise.all([
    getCurrentProfile(),
    getScoutDetails(),
    getLeaderDetails(),
  ]);
  const isScout = usesScoutDetails(profile?.role);
  const answers = isScout ? scoutAnswers(scout) : leaderAnswers(leader);

  // Derived on read, never stored — the same rule for both roles.
  const birthDate = isScout ? scout?.date_of_birth : leader?.date_of_birth;
  const age = birthDate ? ageFromDateOfBirth(birthDate) : null;

  // No signed URL is minted here on purpose. One signed at render time expires
  // 60 seconds later — usually before anyone clicks View — and until then it is
  // a live link to a child's identity document sitting in the page source.
  // DocumentUpload asks for a fresh one when the button is pressed.

  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href="/dashboard"
          className="text-sm text-brand-ink underline-offset-4 hover:underline"
        >
          <span aria-hidden className="inline-block rtl:-scale-x-100">←</span> {t.back}
        </Link>

        <h1 className="mt-3 text-2xl sm:text-[28px] font-semibold tracking-tight text-ink">
          {t.title}
        </h1>
        <p className="mt-2 text-ink-muted">
          {t.intro}
        </p>

        <div className="mt-8 rounded-2xl border border-line bg-surface-raised p-6">
          <ProfileForm fullName={profile?.full_name ?? ""} />
        </div>

        <section aria-labelledby="details-heading" className="mt-8">
          <h2
            id="details-heading"
            className="text-lg font-semibold tracking-tight text-ink"
          >
            {t.questionsTitle}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {t.questionsIntro}
            {age !== null ? <> {t.age(age)}</> : null}
          </p>
          <div className="mt-4 rounded-2xl border border-line bg-surface-raised p-6">
            <DetailsForm
              action={updateDetailsAction}
              questions={localizeQuestions(questionsForRole(profile?.role), locale)}
              answers={answers}
              submitLabel={t.save}
              pendingLabel={t.saving}
            />
          </div>
        </section>

        {/* The document upload used to be a separate section here. It is now
            one of the questions in the form above — the birth certificate for
            scouts, the ID card for leaders — because both are required to
            complete registration, and a required field that lives outside the
            form you submit is a trap. */}

        {/* Read-only facts: changing either one is a separate, guarded flow. */}
        <dl className="mt-6 space-y-4 rounded-2xl border border-line bg-surface p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-sm font-medium text-ink">{t.email}</dt>
            <dd className="text-sm text-ink-muted" dir="ltr">{user.email}</dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-sm font-medium text-ink">{t.role}</dt>
            <dd className="text-sm text-ink-muted">
              {profile ? all.roles.labels[profile.role] : "—"}
            </dd>
          </div>
          <p className="border-t border-line pt-4 text-xs text-ink-subtle">
            {t.roleNote}{" "}
            <Link
              href="/reset-password"
              className="font-medium text-brand-ink underline-offset-4 hover:underline"
            >
              {t.setNewPassword}
            </Link>
            .
          </p>
        </dl>
      </div>
    </SiteShell>
  );
}
