import type { Metadata } from "next";
import { SiteShell } from "@/components/site-shell";
import { requireRole, type Profile } from "@/lib/dal";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { InviteForm } from "@/components/members/invite-form";
import { CopyButton } from "@/components/members/copy-button";
import { revokeInviteAction } from "@/app/members/actions";

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
};

const ROLE_BADGE: Record<Role, string> = {
  leader:
    "bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200",
  scout: "bg-surface text-ink-muted",
  parent:
    "bg-accent-500/15 text-accent-600 dark:bg-accent-500/10",
};

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
  // The real gate. proxy.ts only checked that *a* session exists;
  // this redirects anyone who isn't a leader.
  await requireRole("leader");

  const supabase = await createClient();

  const [{ data: memberRows }, { data: inviteRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, created_at, updated_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("leader_invites")
      .select("code, note, created_at, expires_at, used_by, used_at")
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

        <dl className="mt-6 flex flex-wrap gap-3">
          {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ------------------------------------------------------- Invites */}
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
              spent. Revoking removes an unused code immediately.
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
                      colSpan={4}
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
                          {status !== "used" ? (
                            <form action={revokeInviteAction}>
                              <input
                                type="hidden"
                                name="code"
                                value={invite.code}
                              />
                              <button
                                type="submit"
                                className="text-xs font-medium text-red-600 underline-offset-4 hover:underline"
                              >
                                Revoke
                              </button>
                            </form>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
