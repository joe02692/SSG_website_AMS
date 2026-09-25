import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { requireUser, getCurrentProfile } from "@/lib/dal";
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  isSiteAdminRole,
  isStageRole,
} from "@/lib/roles";

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

  const firstName = profile?.full_name?.trim().split(/\s+/)[0];

  const actions = [
    {
      href: "/dashboard/profile",
      title: "Your details",
      body: "Update your answers, contact numbers and documents.",
      show: true,
    },
    {
      href: "/dashboard/stage",
      title: "Your stage",
      body: "The members and plans for the stage you run.",
      show: isStageRole(profile?.role),
    },
    {
      href: "/members",
      title: "Manage members",
      body: "Every account, leader requests, roles and registrations.",
      show: isSiteAdminRole(profile?.role),
    },
  ].filter((a) => a.show);

  return (
    <SiteShell>
      {/* Welcome band — the site's forest, so the members area reads as the
          same place as the homepage rather than a separate admin tool. */}
      <section className="on-dark relative overflow-hidden bg-forest text-cream">
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-sun" />
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
          <p className="font-display text-base text-sun">
            <span lang="ar" dir="rtl">أهلاً</span> · Welcome back
          </p>
          <h1 className="mt-1 text-[clamp(24px,4vw,34px)] leading-tight text-white">
            {firstName ? `Hello, ${firstName}` : "Hello"}
          </h1>
          <p className="mt-2 max-w-xl text-cream/85">
            Your account is set up. Section records and camp bookings land here
            in the coming weeks.
          </p>
          {profile ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-sun px-3 py-1 text-sm font-semibold text-forest">
              {ROLE_LABELS[profile.role]}
            </p>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        {pw === "updated" ? (
          <p
            role="status"
            className="mb-6 rounded-lg border border-success-line bg-success-surface px-3 py-2.5 text-sm text-success-ink"
          >
            Your password has been updated.
          </p>
        ) : null}

        {denied ? (
          <p
            role="alert"
            className="mb-6 rounded-lg border border-warning-line bg-warning-surface px-3 py-2.5 text-sm text-warning-ink"
          >
            You don&apos;t have access to that area.
          </p>
        ) : null}

        <h2 className="text-xl text-maroon">Where to next</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((a) => (
            <li key={a.href}>
              <Link
                href={a.href}
                className="group flex h-full flex-col rounded-2xl border-2 border-line bg-surface-raised p-5 transition hover:-translate-y-0.5 hover:border-leaf hover:shadow-md"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-display text-lg text-forest">{a.title}</span>
                  <span
                    aria-hidden
                    className="grid size-8 place-items-center rounded-full bg-sun text-forest transition group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </span>
                <span className="mt-2 text-sm text-ink-muted">{a.body}</span>
              </Link>
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-xl text-maroon">Your account</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border-2 border-line bg-surface-raised p-5">
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              Role
            </dt>
            <dd className="mt-1.5">
              <span className="block font-display text-lg text-ink">
                {profile ? ROLE_LABELS[profile.role] : "—"}
              </span>
              {profile ? (
                <span className="mt-1 block text-sm text-ink-muted">
                  {ROLE_DESCRIPTIONS[profile.role]}
                </span>
              ) : null}
            </dd>
          </div>

          <div className="rounded-2xl border-2 border-line bg-surface-raised p-5">
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              Email
            </dt>
            <dd className="mt-1.5 truncate font-display text-lg text-ink">
              {user.email}
            </dd>
          </div>

          <div className="rounded-2xl border-2 border-line bg-surface-raised p-5">
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              Member since
            </dt>
            <dd className="mt-1.5 font-display text-lg text-ink">
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
          <p className="mt-6 rounded-lg border border-warning-line bg-warning-surface px-3 py-2.5 text-sm text-warning-ink">
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
