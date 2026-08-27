import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { requireUser, getCurrentProfile } from "@/lib/dal";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string; pw?: string }>;
}) {
  // Re-checked here on purpose. proxy.ts already redirected anonymous
  // visitors, but that is an optimistic cookie check — this is the one that
  // actually guards the data.
  const user = await requireUser();
  const profile = await getCurrentProfile();
  const { denied, pw } = await searchParams;

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        {pw === "updated" ? (
          <p
            role="status"
            className="mb-6 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm text-brand-900"
          >
            Your password has been updated.
          </p>
        ) : null}

        {denied ? (
          <p
            role="alert"
            className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900"
          >
            You don&apos;t have access to that area.
          </p>
        ) : null}

        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <p className="mt-2 text-ink-muted">
          Your account is set up. Section records and camp bookings land here in
          the coming weeks.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/dashboard/profile"
            className="rounded-lg border border-line bg-surface-raised px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-brand-300"
          >
            Edit your details
          </Link>
          {profile?.role === "leader" ? (
            <Link
              href="/members"
              className="rounded-lg border border-line bg-surface-raised px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-brand-300"
            >
              Manage members
            </Link>
          ) : null}
        </div>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-line bg-surface-raised p-5">
            <dt className="text-xs uppercase tracking-wider text-ink-subtle">
              Role
            </dt>
            <dd className="mt-1.5 text-lg font-semibold text-ink">
              {profile ? ROLE_LABELS[profile.role] : "—"}
            </dd>
            {profile ? (
              <p className="mt-1 text-sm text-ink-muted">
                {ROLE_DESCRIPTIONS[profile.role]}
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-line bg-surface-raised p-5">
            <dt className="text-xs uppercase tracking-wider text-ink-subtle">
              Email
            </dt>
            <dd className="mt-1.5 truncate text-lg font-semibold text-ink">
              {user.email}
            </dd>
          </div>

          <div className="rounded-xl border border-line bg-surface-raised p-5">
            <dt className="text-xs uppercase tracking-wider text-ink-subtle">
              Member since
            </dt>
            <dd className="mt-1.5 text-lg font-semibold text-ink">
              {profile
                ? new Date(profile.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "—"}
            </dd>
          </div>
        </dl>

        {!profile ? (
          <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
            No profile row was found for this account. Run the migration in
            <code className="mx-1 font-mono text-xs">
              supabase/migrations/0001_profiles_and_roles.sql
            </code>
            — existing accounts created before the trigger existed will need a
            row inserted manually.
          </p>
        ) : null}
      </div>
    </SiteShell>
  );
}
