import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { requireSiteAdmin } from "@/lib/dal";
import { ROLE_LABELS, isHeadSiteAdminRole, type Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { DeleteMemberButton } from "@/components/members/delete-member-button";
import { RequestReview } from "@/components/members/request-review";
import { ChangeRole } from "@/components/members/change-role";
import { RecoveryLinkButton } from "@/components/members/recovery-link-button";

export const metadata: Metadata = {
  title: "Members",
};

type RequestRow = {
  id: string;
  full_name: string | null;
  requested_at: string | null;
  stages: { name_en: string; name_ar: string } | null;
};

const ROLE_BADGE: Record<Role, string> = {
  head_site_admin:
    "bg-accent-500/20 text-accent-600 dark:bg-accent-500/15 dark:text-accent-400",
  site_admin:
    "bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200",
  stage_admin:
    "bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200",
  stage_leader:
    "bg-brand-50 text-brand-ink dark:bg-brand-950/60",
  leader: "bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200",
  pending_leader:
    "bg-warning-surface text-warning-ink border border-warning-line",
  scout: "bg-surface text-ink-muted",
  parent: "bg-accent-500/15 text-accent-600 dark:bg-accent-500/10",
};

/** Roles worth a headline count on this page. */
const COUNTED_ROLES: Role[] = [
  "site_admin",
  "stage_admin",
  "stage_leader",
  "scout",
];

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}


/** Exactly the columns the table renders — see the query below. */
type MemberRow = {
  id: string;
  full_name: string | null;
  role: Role;
  created_at: string;
};

/** Ceiling on both list queries — see the note where they are issued. */
const MAX_ROWS = 500;

export default async function MembersPage() {
  // The real gate. proxy.ts only checked that *a* session exists.
  // Site-level staff only — stage admins and stage leaders are redirected;
  // /dashboard/stage is their page.
  const viewer = await requireSiteAdmin();
  // Deciding who becomes a leader — and changing anyone's role afterwards —
  // is narrower still: the head site admin alone.
  const canDecideRoles = isHeadSiteAdminRole(viewer.role);

  const supabase = await createClient();

  // Explicit column lists, not PROFILE_COLUMNS.
  //
  // PROFILE_COLUMNS is shaped for the single-row getCurrentProfile(); reusing
  // it here dragged `details` — the onboarding answers JSONB — across the wire
  // for every member on the site, to render a table that only ever reads name,
  // role and join date. Personal data should not travel to a page that has no
  // use for it.
  //
  // The limits are not decoration either. Neither query had one, and
  // 500 is far above the ~400 members
  // the group expects and far below the point where an un-paginated table
  // becomes unusable; if either is ever hit, that is the signal to paginate
  // rather than the moment it silently falls over.
  const [{ data: memberRows }, { data: requestRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, created_at")
      .order("created_at", { ascending: true })
      .limit(MAX_ROWS),
    // Pending requests, oldest first — whoever has waited longest is decided
    // on first.
    supabase
      .from("profiles")
      .select("id, full_name, requested_at, stages:requested_stage_id(name_en, name_ar)")
      .eq("role", "pending_leader")
      .order("requested_at", { ascending: true })
      .limit(MAX_ROWS),
  ]);

  const members = (memberRows ?? []) as MemberRow[];
  const requests = (requestRows ?? []) as unknown as RequestRow[];

  const counts = members.reduce<Record<string, number>>((acc, m) => {
    acc[m.role] = (acc[m.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Members
        </h1>
        <p className="mt-2 text-ink-muted">
          Everyone registered in the system, and the leader requests waiting for
          your decision.
        </p>

        <p className="mt-4">
          <Link
            href="/members/scouts"
            className="inline-flex rounded-lg border border-line bg-surface-raised px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-brand-300"
          >
            Registrations →
          </Link>
        </p>

        <dl className="mt-6 flex flex-wrap gap-3">
          {COUNTED_ROLES.map((role) => (
            <div
              key={role}
              className="rounded-lg border border-line bg-surface-raised px-4 py-2.5"
            >
              <dt className="text-xs uppercase tracking-wider text-ink-subtle">
                {ROLE_LABELS[role]}s
              </dt>
              <dd className="text-lg font-semibold text-ink">
                {counts[role] ?? 0}
              </dd>
            </div>
          ))}
        </dl>

        {/* ------------------------------------------------------ Members */}
        <section aria-labelledby="members-heading" className="mt-10">
          <h2
            id="members-heading"
            className="text-xl font-semibold tracking-tight text-ink"
          >
            All members
          </h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-130 text-left text-sm">
              <thead className="border-b border-line bg-surface text-xs uppercase tracking-wider text-ink-subtle">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Role
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Joined
                  </th>
                  {canDecideRoles ? (
                    <th scope="col" className="px-4 py-3 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface-raised">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-4 py-3 font-medium text-ink">
                      {member.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_BADGE[member.role]}`}
                      >
                        {ROLE_LABELS[member.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {formatDate(member.created_at)}
                    </td>
                    {canDecideRoles ? (
                      <td className="px-4 py-3">
                        {member.id === viewer.id ||
                        member.role === "head_site_admin" ? null : (
                          <div className="flex flex-col items-end gap-2">
                            <ChangeRole
                              memberId={member.id}
                              name={member.full_name ?? "this member"}
                              current={member.role}
                            />
                            {/* Password reset by link, because there is no
                                working mailer until the group has a domain —
                                see Tasks/email-setup.md. Without this a member
                                who forgets their password has no way back. */}
                            <RecoveryLinkButton
                              memberId={member.id}
                              name={member.full_name ?? "this member"}
                            />
                            <DeleteMemberButton
                              memberId={member.id}
                              name={member.full_name ?? "this member"}
                            />
                          </div>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Requests — head site admin only.
            Replaces the invite-code section. A code was a bearer token: whoever
            held it became a leader, and you learned who afterwards. Here the
            person is named before they have any access at all. */}
        {canDecideRoles ? (
          <section aria-labelledby="requests-heading" className="mt-12">
            <h2
              id="requests-heading"
              className="text-xl font-semibold tracking-tight text-ink"
            >
              Leader requests
              {requests.length > 0 ? (
                <span className="ml-2 rounded-full bg-brand-600 px-2 py-0.5 align-middle text-xs font-semibold text-white">
                  {requests.length}
                </span>
              ) : null}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              People who have asked to join as leaders. They have no access to
              anything until you approve them, and you choose the role.
            </p>

            {requests.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
                <p className="text-sm text-ink-muted">
                  No requests waiting.
                </p>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-150 text-left text-sm">
                  <thead className="border-b border-line bg-surface text-xs uppercase tracking-wider text-ink-subtle">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-medium">Name</th>
                      <th scope="col" className="px-4 py-3 font-medium">Stage</th>
                      <th scope="col" className="px-4 py-3 font-medium">Asked</th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">
                        Decision
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-surface-raised">
                    {requests.map((request) => (
                      <tr key={request.id}>
                        <td className="px-4 py-3 font-medium text-ink">
                          {request.full_name ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                          {request.stages
                            ? `${request.stages.name_en} — ${request.stages.name_ar}`
                            : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                          {request.requested_at
                            ? formatDate(request.requested_at)
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <RequestReview
                            memberId={request.id}
                            name={request.full_name ?? "this person"}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </SiteShell>
  );
}
