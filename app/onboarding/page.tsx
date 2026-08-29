import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile, requireUser } from "@/lib/dal";
import { DetailsForm } from "@/components/onboarding/details-form";
import { completeOnboardingAction } from "@/app/onboarding/actions";

export const metadata: Metadata = {
  title: "Your details",
};

export default async function OnboardingPage() {
  await requireUser();
  const profile = await getCurrentProfile();

  // Already answered — nothing to do here. Without this, the dashboard
  // layout's redirect and this page could bounce a member back and forth.
  if (profile?.details_completed_at) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="border-b border-line bg-canvas">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-sm font-semibold text-ink"
          >
            <span
              aria-hidden
              className="grid size-8 place-items-center rounded-lg bg-brand-700 text-xs font-bold text-white"
            >
              ES
            </span>
            El-Salam Scouting Group
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-lg rounded-2xl border border-line bg-canvas p-6 shadow-sm sm:p-8">
          <div className="mb-6 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
              One last step
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              Your details
            </h1>
            <p className="text-sm text-ink-muted">
              A few questions so leaders have what they need. You can change any
              of these later from your dashboard.
            </p>
          </div>

          <DetailsForm
            action={completeOnboardingAction}
            profile={profile}
            submitLabel="Finish signing up"
            pendingLabel="Saving…"
          />
        </div>
      </main>
    </div>
  );
}
