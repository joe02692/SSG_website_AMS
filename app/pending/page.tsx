import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { getCurrentProfile, requireUser } from "@/lib/dal";
import { isPendingRole } from "@/lib/roles";
import { signOutAction } from "@/app/auth/actions";

export const metadata: Metadata = { title: "Request pending" };

/**
 * Where an unapproved leader lands.
 *
 * Anyone whose request has been approved is sent on to the dashboard, so this
 * page cannot become a dead end someone is stuck on after being let in.
 */
export default async function PendingPage() {
  await requireUser();
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isPendingRole(profile.role)) redirect("/dashboard");

  return (
    <SiteShell>
      <div className="mx-auto max-w-xl px-4 py-20 sm:px-6">
        <div className="rounded-2xl border border-line bg-surface-raised p-8 text-center">
          <span
            aria-hidden
            className="mx-auto grid size-12 place-items-center rounded-full bg-brand-50 dark:bg-brand-950"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              className="size-6 text-brand-ink"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </span>

          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">
            Your request has been sent
          </h1>

          <p className="mt-3 text-ink-muted">
            {profile.full_name ? `Thanks, ${profile.full_name}. ` : ""}
            We&apos;re waiting for an admin to approve your account. Until then
            there&apos;s nothing here for you to fill in.
          </p>

          <p className="mt-4 text-sm text-ink-subtle">
            You can sign in and check back at any time — this page will change
            as soon as you&apos;re approved. If it&apos;s urgent, speak to
            someone in the group directly.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Back to the site
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink-muted transition hover:border-brand-300 hover:text-ink"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
