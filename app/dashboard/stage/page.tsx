import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { requireRole } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Stage",
};

export default async function StagePage() {
  // Leader-only. proxy.ts already bounced anonymous visitors; this is the
  // check that actually enforces the role.
  const profile = await requireRole("leader");

  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href="/dashboard"
          className="text-sm text-brand-700 underline-offset-4 hover:underline dark:text-brand-300"
        >
          ← Dashboard
        </Link>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
          Stage
        </h1>
        <p className="mt-2 text-ink-muted">
          Manage the section you lead — its members, and its season plan.
        </p>

        <div className="mt-8 rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <p className="text-lg font-medium text-ink">Nothing here yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            Once stages are set up in the database, this page will show the
            stage you&apos;re assigned to, the scouts in it, and the season plan
            you can edit and upload.
          </p>
          <p className="mt-4 text-xs text-ink-subtle">
            Signed in as {profile.full_name ?? "a leader"}.
          </p>
        </div>
      </div>
    </SiteShell>
  );
}
