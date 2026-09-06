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
import { ROLE_LABELS } from "@/lib/roles";
import { ProfileForm } from "@/components/profile/profile-form";
import { DetailsForm } from "@/components/onboarding/details-form";
import { updateDetailsAction } from "@/app/onboarding/actions";
import {
  ageFromDateOfBirth,
  questionsForRole,
  usesScoutDetails,
} from "@/lib/onboarding";

export const metadata: Metadata = {
  title: "Your details",
};

export default async function ProfilePage() {
  const user = await requireUser();

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
          className="text-sm text-brand-ink underline-offset-4 hover:underline dark:text-brand-300"
        >
          ← Dashboard
        </Link>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
          Your details
        </h1>
        <p className="mt-2 text-ink-muted">
          Keep your information up to date so leaders can reach you.
        </p>

        <div className="mt-8 rounded-2xl border border-line bg-surface-raised p-6">
          <ProfileForm fullName={profile?.full_name ?? ""} />
        </div>

        <section aria-labelledby="details-heading" className="mt-8">
          <h2
            id="details-heading"
            className="text-lg font-semibold tracking-tight text-ink"
          >
            Membership questions
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            The answers you gave when you joined.
            {age !== null ? (
              <>
                {" "}
                You are <span className="font-medium text-ink">{age}</span> —
                worked out from your date of birth, so it updates itself every
                birthday.
              </>
            ) : null}
          </p>
          <div className="mt-4 rounded-2xl border border-line bg-surface-raised p-6">
            <DetailsForm
              action={updateDetailsAction}
              questions={questionsForRole(profile?.role)}
              answers={answers}
              submitLabel="Save details"
              pendingLabel="Saving…"
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
            <dt className="text-sm font-medium text-ink">Email address</dt>
            <dd className="text-sm text-ink-muted">{user.email}</dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-sm font-medium text-ink">Role</dt>
            <dd className="text-sm text-ink-muted">
              {profile ? ROLE_LABELS[profile.role] : "—"}
            </dd>
          </div>
          <p className="border-t border-line pt-4 text-xs text-ink-subtle">
            Your role is set by the group and can only be changed by a leader.
            To change your password, use{" "}
            <Link
              href="/reset-password"
              className="font-medium text-brand-ink underline-offset-4 hover:underline dark:text-brand-300"
            >
              set a new password
            </Link>
            .
          </p>
        </dl>
      </div>
    </SiteShell>
  );
}
