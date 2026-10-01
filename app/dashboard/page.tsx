import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { BannerScenery } from "@/components/green-scenery";
import { requireUser, getCurrentProfile } from "@/lib/dal";
import { isSiteAdminRole, isStageRole } from "@/lib/roles";
import { getLocale, getT } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).account.dashboard.metaTitle };
}

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
  const all = await getT();
  const t = all.account.dashboard;
  const locale = await getLocale();

  const firstName = profile?.full_name?.trim().split(/\s+/)[0];

  const actions = [
    {
      href: "/dashboard/profile",
      title: t.detailsTitle,
      body: t.detailsBody,
      show: true,
    },
    {
      href: "/dashboard/stage",
      title: t.stageTitle,
      body: t.stageBody,
      show: isStageRole(profile?.role),
    },
    {
      href: "/members",
      title: t.membersTitle,
      body: t.membersBody,
      show: isSiteAdminRole(profile?.role),
    },
  ].filter((a) => a.show);

  return (
    <SiteShell>
      {/* Welcome band — the site's forest, so the members area reads as the
          same place as the homepage rather than a separate admin tool. */}
      <section className="on-dark relative overflow-hidden bg-forest text-cream">
        <BannerScenery />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-sun" />
        <div className="relative mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
          <p className="font-display text-base text-sun">
            {t.welcomeBack}
          </p>
          <h1 className="mt-1 text-[clamp(24px,4vw,34px)] leading-tight text-white">
            {t.hello(firstName)}
          </h1>
          <p className="mt-2 max-w-xl text-cream/85">
            {t.intro}
          </p>
          {profile ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-sun px-3 py-1 text-sm font-semibold text-forest">
              {all.roles.labels[profile.role]}
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
            {t.passwordUpdated}
          </p>
        ) : null}

        {denied ? (
          <p
            role="alert"
            className="mb-6 rounded-lg border border-warning-line bg-warning-surface px-3 py-2.5 text-sm text-warning-ink"
          >
            {t.denied}
          </p>
        ) : null}

        <h2 className="text-xl text-maroon">{t.whereNext}</h2>
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
                    className="grid size-8 place-items-center rounded-full bg-sun text-forest transition group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
                  >
                    <span className="inline-block rtl:-scale-x-100">→</span>
                  </span>
                </span>
                <span className="mt-2 text-sm text-ink-muted">{a.body}</span>
              </Link>
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-xl text-maroon">{t.yourAccount}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border-2 border-line bg-surface-raised p-5">
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              {t.role}
            </dt>
            <dd className="mt-1.5">
              <span className="block font-display text-lg text-ink">
                {profile ? all.roles.labels[profile.role] : "—"}
              </span>
              {profile ? (
                <span className="mt-1 block text-sm text-ink-muted">
                  {all.roles.descriptions[profile.role]}
                </span>
              ) : null}
            </dd>
          </div>

          <div className="rounded-2xl border-2 border-line bg-surface-raised p-5">
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              {t.email}
            </dt>
            <dd className="mt-1.5 truncate font-display text-lg text-ink" dir="ltr">
              <span className="block rtl:text-right">{user.email}</span>
            </dd>
          </div>

          <div className="rounded-2xl border-2 border-line bg-surface-raised p-5">
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              {t.memberSince}
            </dt>
            <dd className="mt-1.5 font-display text-lg text-ink">
              {profile
                ? new Date(profile.created_at).toLocaleDateString(intlLocale(locale), {
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
            {t.noProfile}
          </p>
        ) : null}
      </div>
    </SiteShell>
  );
}
