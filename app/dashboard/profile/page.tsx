import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { requireUser, getCurrentProfile } from "@/lib/dal";
import { ROLE_LABELS } from "@/lib/roles";
import { ProfileForm } from "@/components/profile/profile-form";
import { DetailsForm } from "@/components/onboarding/details-form";
import { updateDetailsAction } from "@/app/onboarding/actions";

export const metadata: Metadata = {
  title: "Your details",
};

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await getCurrentProfile();

  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href="/dashboard"
          className="text-sm text-brand-700 underline-offset-4 hover:underline dark:text-brand-300"
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
          </p>
          <div className="mt-4 rounded-2xl border border-line bg-surface-raised p-6">
            <DetailsForm
              action={updateDetailsAction}
              profile={profile}
              submitLabel="Save details"
              pendingLabel="Saving…"
            />
          </div>
        </section>

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
              className="font-medium text-brand-700 underline-offset-4 hover:underline dark:text-brand-300"
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
