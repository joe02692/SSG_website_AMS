import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { getCurrentProfile, requireUser } from "@/lib/dal";
import { isPendingRole } from "@/lib/roles";
import { signOutAction } from "@/app/auth/actions";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getT()).account.pending;
  return { title: t.metaTitle, description: t.metaDescription, robots: { index: false } };
}

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

  const t = (await getT()).account.pending;
  const states = ["done", "current", "next"] as const;
  const steps = t.steps.map((step, i) => ({ ...step, state: states[i] }));

  return (
    <SiteShell>
      <div className="mx-auto max-w-xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="rounded-3xl border-2 border-line bg-surface-raised p-7 sm:p-9">
          <p className="font-display text-base text-leaf">
            {t.eyebrow}
          </p>
          <h1 className="mt-1 text-[clamp(22px,4vw,28px)] leading-tight text-maroon">
            {t.title}
          </h1>
          <p className="mt-3 text-ink-muted">
            {profile.full_name ? t.thanks(profile.full_name) : null}
            {t.waiting}
          </p>

          {/* Where they are in the process — the question everyone waiting
              actually has. The current step is marked for screen readers too. */}
          <ol className="mt-7 space-y-0">
            {steps.map((step, i) => (
              <li
                key={step.title}
                aria-current={step.state === "current" ? "step" : undefined}
                className="relative flex gap-4 pb-6 last:pb-0"
              >
                {i < steps.length - 1 ? (
                  <span aria-hidden className="absolute start-[15px] top-8 h-[calc(100%-2rem)] w-0.5 bg-line" />
                ) : null}
                <span
                  aria-hidden
                  className={`relative grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                    step.state === "done"
                      ? "bg-leaf text-white"
                      : step.state === "current"
                        ? "bg-sun text-forest ring-4 ring-sun/30"
                        : "border-2 border-line bg-canvas text-ink-subtle"
                  }`}
                >
                  {step.state === "done" ? "✓" : i + 1}
                </span>
                <span>
                  <span className="block font-display text-base text-forest">
                    {step.title}
                    {step.state === "current" ? (
                      <span className="ms-2 align-middle text-xs font-semibold uppercase tracking-wider text-maroon">
                        {t.now}
                      </span>
                    ) : null}
                  </span>
                  <span className="block text-sm text-ink-muted">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>

          <p className="mt-7 text-sm text-ink-subtle">
            {t.checkBack}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-md bg-forest px-5 py-2.5 text-sm font-bold text-cream transition hover:opacity-90"
            >
              {t.backToSite}
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-md border-2 border-line px-5 py-2 text-sm font-semibold text-ink-muted transition hover:border-leaf hover:text-ink"
              >
                {t.signOut}
              </button>
            </form>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
