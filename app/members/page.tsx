import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { PROFILE_COLUMNS, requireSiteAdmin, type Profile } from "@/lib/dal";
import { ROLE_LABELS, isHeadSiteAdminRole, type Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { InviteForm } from "@/components/members/invite-form";
import { CopyButton } from "@/components/members/copy-button";
import { DeleteMemberButton } from "@/components/members/delete-member-button";
import { DeleteInviteButton } from "@/components/members/delete-invite-button";

export const metadata: Metadata = {
  title: "Members",
};

type Invite = {
  code: string;
  note: string | null;
  created_at: string;
  expires_at: string | null;
  used_by: string | null;
  used_at: string | null;
  grants_role: Role;
};

const ROLE_BADGE: Record<Role, string> = {
  head_site_admin:
    "bg-accent-500/20 text-accent-600 dark:bg-accent-500/15 dark:text-accent-400",
  site_admin:
    "bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200",
  stage_admin:
    "bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200",
  stage_leader:
    "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300",
  leader: "bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200",
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

function inviteStatus(invite: Invite): "used" | "expired" | "active" {
  if (invite.used_at) return "used";
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return "expired";
  }
  return "active";
}

export default async function MembersPage() {
  // The real gate. proxy.ts only checked that *a* session exists.
  // Site-level staff only — stage admins and stage leaders are redirected;
  // /dashboard/stage is their page.
  const viewer = await requireSiteAdmin();
  // Issuing and revoking codes is narrower still: the head site admin alone.
  const canManageInvites = isHeadSiteAdminRole(viewer.role);

  const supabase = await createClient();

  const [{ data: memberRows }, { data: inviteRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .order("created_at", { ascending: true }),
    supabase
      .from("leader_invites")
      .select(
        "code, note, created_at, expires_at, used_by, used_at, grants_role",
      )
      .order("created_at", { ascending: false }),
  ]);

  const members = (memberRows ?? []) as Profile[];
  const invites = (inviteRows ?? []) as Invite[];

  const nameById = new Map(members.map((m) => [m.id, m.full_name]));
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
          Everyone registered in the system, and the invite codes that grant
          leader access.
        </p>

        <p className="mt-4">
          <Link
            href="/members/scouts"
            className="inline-flex rounded-lg border border-line bg-surface-raised px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-brand-300"
          >
            Scout registrations →
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
                  {canManageInvites ? (
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
                    {canManageInvites ? (
                      <td className="px-4 py-3">
                        {member.id === viewer.id ||
                        member.role === "head_site_admin" ? null : (
                          <DeleteMemberButton
                            memberId={member.id}
                            name={member.full_name ?? "this member"}
                          />
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Invites — head site admin only. An unused code on screen is
            effectively an invitation, so site admins don't see this section
            at all rather than seeing codes they can't issue. */}
        {canManageInvites ? (
        <section
          aria-labelledby="invites-heading"
          className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr]"
        >
          <div>
            <h2
              id="invites-heading"
              className="text-xl font-semibold tracking-tight text-ink"
            >
              Leader invites
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              A code is single-use: once someone signs up with it, it&apos;s
              spent. The expiry is a deadline for <em>redeeming</em> it — it
              never affects an account that already exists.
            </p>
            <div className="mt-5 rounded-xl border border-line bg-surface-raised p-5">
              <InviteForm />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-line self-start">
            <table className="w-full min-w-150 text-left text-sm">
              <thead className="border-b border-line bg-surface text-xs uppercase tracking-wider text-ink-subtle">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Code
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Grants
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    For
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface-raised">
                {invites.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-ink-subtle"
                    >
                      No invite codes yet — create the first one on the left.
                    </td>
                  </tr>
                ) : (
                  invites.map((invite) => {
                    const status = inviteStatus(invite);
                    return (
                      <tr key={invite.code}>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-2">
                            <code className="font-mono text-xs font-semibold text-ink">
                              {invite.code}
                            </code>
                            {status === "active" ? (
                              <CopyButton text={invite.code} />
                            ) : null}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_BADGE[invite.grants_role]}`}
                          >
                            {ROLE_LABELS[invite.grants_role]}
                          </span>
                        </td>
                        <td className="max-w-40 truncate px-4 py-3 text-ink-muted">
                          {invite.note ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          {status === "used" ? (
                            <span className="text-xs text-ink-muted">
                              Used by{" "}
                              <span className="font-medium text-ink">
                                {nameById.get(invite.used_by ?? "") ??
                                  "a member"}
                              </span>{" "}
                              on {formatDate(invite.used_at)}
                            </span>
                          ) : status === "expired" ? (
                            <span className="rounded-full bg-surface px-2.5 py-1 text-xs text-ink-subtle">
                              Expired {formatDate(invite.expires_at)}
                            </span>
                          ) : (
                            <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-medium text-brand-800 dark:bg-brand-950 dark:text-brand-200">
                              Active
                              {invite.expires_at
                                ? ` until ${formatDate(invite.expires_at)}`
                                : ""}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DeleteInviteButton
                            code={invite.code}
                            used={status === "used"}
                            usedByName={nameById.get(invite.used_by ?? "")}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
        ) : null}
      </div>
    </SiteShell>
  );
}
