import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { requireSiteAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { ageFromDateOfBirth } from "@/lib/onboarding";
import { ViewDocumentButton } from "@/components/members/view-document-button";
import { LeadersTable, type LeaderRow } from "@/components/members/leaders-table";
import { getLocale, getT } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/config";
import { optionLabel } from "@/lib/i18n/onboarding";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).members.scouts.metaTitle };
}

type ScoutRow = {
  profile_id: string;
  date_of_birth: string;
  address: string;
  national_id: string | null;
  personal_phone: string;
  parent_phone: string;
  document_path: string | null;
  profiles: { full_name: string | null } | null;
  stages: { name_en: string; sort: number } | null;
};

function formatDate(value: string, locale: string): string {
  return new Date(value).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Backstop on the roster query — see the note where it is issued. */
const MAX_ROWS = 1000;

export default async function ScoutsPage() {
  // Site-level staff only. The RLS policy "scout_details: site admins read all"
  // enforces the same rule at the database, so a stage leader who guessed this
  // URL would get an empty list even if this check were removed.
  await requireSiteAdmin();
  const t = (await getT()).members.scouts;
  const locale = await getLocale();
  const dateLocale = intlLocale(locale);

  const supabase = await createClient();
  // Ordered and capped by Postgres, not by JavaScript afterwards.
  //
  // Sorting in Node worked at this size but quietly rules out pagination: you
  // cannot page through rows whose order is decided after they arrive. Doing it
  // in the query keeps that door open. The limit is a backstop — the group
  // expects ~400 scouts, and an un-paginated table of several thousand would be
  // unusable long before it was slow.
  const { data } = await supabase
    .from("scout_details")
    .select(
      "profile_id, date_of_birth, address, national_id, personal_phone, parent_phone, document_path, profiles(full_name), stages(name_en, sort)",
    )
    .order("sort", { referencedTable: "stages", ascending: true })
    .order("profile_id", { ascending: true })
    .limit(MAX_ROWS);

  const rows = (data ?? []) as unknown as ScoutRow[];

  // Leaders. Ordered by the year they joined so the longest-serving are at the top, which
  // is the order a secretary reads this list in.
  const { data: leaderData, error: leaderError } = await supabase
    .from("leader_details")
    .select(
      "profile_id, date_of_birth, personal_phone, national_id, id_card_path, applicant_status, university, faculty, academic_year, leadership_years, join_year, committees, gender, profiles(full_name, role), leader_committees(stages(name_en))",
    )
    .order("join_year", { ascending: true })
    .limit(MAX_ROWS);

  const leaders = (leaderData ?? []) as unknown as LeaderRow[];

  const withDocument = rows.filter((r) => r.document_path).length;
  const withIdCard = leaders.filter((l) => l.id_card_path).length;

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href="/members"
          className="text-sm text-brand-ink underline-offset-4 hover:underline"
        >
          <span aria-hidden className="inline-block rtl:-scale-x-100">←</span> {t.back}
        </Link>

        <h1 className="mt-3 text-2xl sm:text-[28px] font-semibold tracking-tight text-ink">
          {t.title}
        </h1>
        <p className="mt-2 text-ink-muted">
          {t.intro}
        </p>

        <p className="mt-6 rounded-lg border border-warning-line bg-warning-surface px-3 py-2.5 text-sm text-warning-ink">
          {t.privacy}
        </p>

        <h2 className="mt-10 text-xl font-semibold tracking-tight text-ink">
          {t.scouts}
        </h2>

        <dl className="mt-4 flex flex-wrap gap-3">
          <div className="rounded-lg border border-line bg-surface-raised px-4 py-2.5">
            <dt className="text-xs uppercase tracking-wider text-ink-subtle">
              {t.registered}
            </dt>
            <dd className="text-lg font-semibold text-ink">{rows.length}</dd>
          </div>
          <div className="rounded-lg border border-line bg-surface-raised px-4 py-2.5">
            <dt className="text-xs uppercase tracking-wider text-ink-subtle">
              {t.certificateOnFile}
            </dt>
            <dd className="text-lg font-semibold text-ink">
              {withDocument}
              <span className="text-sm font-normal text-ink-subtle">
                {" "}
                / {rows.length}
              </span>
            </dd>
          </div>
        </dl>

        {withDocument > 0 ? (
          <p className="mt-6">
            <a
              href="/members/scouts/download-all"
              className="inline-flex rounded-lg border border-line bg-surface-raised px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-brand-300"
            >
              {t.downloadAll}
            </a>
          </p>
        ) : null}

        {rows.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
            <p className="text-lg font-medium text-ink">{t.noScouts}</p>
            <p className="mt-2 text-sm text-ink-muted">
              {t.noScoutsBody}
            </p>
          </div>
        ) : (
          <div className="mt-6 relative overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-200 text-start text-sm">
              <thead className="border-b border-line bg-surface text-xs uppercase tracking-wider text-ink-subtle">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t.name}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t.stage}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t.age}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t.born}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t.phone}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t.parent}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t.nationalId}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t.certificate}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface-raised">
                {rows.map((row) => (
                  <tr key={row.profile_id}>
                    <td className="px-4 py-3">
                      <bdi className="font-medium text-ink">
                        {row.profiles?.full_name ?? "—"}
                      </bdi>
                      <span className="block max-w-60 truncate text-xs text-ink-subtle">
                        <bdi>{row.address}</bdi>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                      {row.stages
                        ? optionLabel(locale, row.stages.name_en)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">
                      {ageFromDateOfBirth(row.date_of_birth) ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                      {formatDate(row.date_of_birth, dateLocale)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-muted" dir="ltr">
                      <span className="block rtl:text-right">{row.personal_phone}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-muted" dir="ltr">
                      <span className="block rtl:text-right">{row.parent_phone}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-muted" dir="ltr">
                      <span className="block rtl:text-right">{row.national_id ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      {row.document_path ? (
                        <ViewDocumentButton
                          path={row.document_path}
                          filename={row.profiles?.full_name ?? "certificate"}
                        />
                      ) : (
                        <span className="text-xs text-ink-subtle">{t.missing}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ------------------------------------------------------------ Leaders */}
        <h2 className="mt-14 text-xl font-semibold tracking-tight text-ink">
          {t.leadersTitle}
        </h2>

        <dl className="mt-4 flex flex-wrap gap-3">
          <div className="rounded-lg border border-line bg-surface-raised px-4 py-2.5">
            <dt className="text-xs uppercase tracking-wider text-ink-subtle">
              {t.registered}
            </dt>
            <dd className="text-lg font-semibold text-ink">{leaders.length}</dd>
          </div>
          <div className="rounded-lg border border-line bg-surface-raised px-4 py-2.5">
            <dt className="text-xs uppercase tracking-wider text-ink-subtle">
              {t.idCardOnFile}
            </dt>
            <dd className="text-lg font-semibold text-ink">
              {withIdCard}
              <span className="text-sm font-normal text-ink-subtle">
                {" "}
                / {leaders.length}
              </span>
            </dd>
          </div>
        </dl>

        {leaderError ? (
          <p
            role="alert"
            className="mt-6 rounded-lg border border-danger-line bg-danger-surface px-3 py-2.5 text-sm text-danger-ink"
          >
            {t.leadersError(leaderError.code ?? "unknown", leaderError.message)}
          </p>
        ) : leaders.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
            <p className="text-lg font-medium text-ink">{t.noLeaders}</p>
            <p className="mt-2 text-sm text-ink-muted">
              {t.noLeadersBody}
            </p>
          </div>
        ) : (
          <LeadersTable rows={leaders} />
        )}
      </div>
    </SiteShell>
  );
}
