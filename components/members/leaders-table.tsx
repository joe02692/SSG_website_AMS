import { ageFromDateOfBirth } from "@/lib/onboarding";
import { getLocale, getT } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/config";
import { optionLabel } from "@/lib/i18n/onboarding";
import { ViewDocumentButton } from "@/components/members/view-document-button";

export type LeaderRow = {
  profile_id: string;
  date_of_birth: string;
  personal_phone: string;
  national_id: string;
  id_card_path: string | null;
  applicant_status: string;
  university: string;
  faculty: string;
  academic_year: string | null;
  leadership_years: number;
  join_year: number;
  gender: string | null;
  committees: string[] | null;
  profiles: { full_name: string | null; role: string } | null;
  leader_committees: { stages: { name_en: string } | null }[] | null;
};

function formatDate(value: string, locale: string): string {
  return new Date(value).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * The leaders roster table.
 *
 * Its own component so the markup can be rendered with sample rows and looked
 * at, which a page behind requireSiteAdmin() cannot be. It also stops the
 * registrations page growing into four hundred lines of two tables.
 */
export async function LeadersTable({ rows }: { rows: LeaderRow[] }) {
  const all = await getT();
  const t = all.members.leaders;
  const s = all.members.scouts;
  const locale = await getLocale();
  const dateLocale = intlLocale(locale);
  const STATUS_LABELS: Record<string, string> = {
    university_student: t.student,
    graduate: t.graduate,
  };
  return (
          <div className="mt-6 relative overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-250 text-start text-sm">
              <thead className="border-b border-line bg-surface text-xs uppercase tracking-wider text-ink-subtle">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {s.name}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t.stages}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t.committees}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {s.age}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {s.born}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {s.phone}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {s.nationalId}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t.study}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t.leading}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t.joinedIn}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t.idCard}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface-raised">
                {rows.map((leader) => {
                  const workCommittees = (leader.committees ?? []).map(
                    (code) => t.committeeNames[code] ?? code,
                  );
                  const committees = (leader.leader_committees ?? [])
                    .map((link) => link.stages?.name_en)
                    .filter((name): name is string => Boolean(name))
                    .map((name) => optionLabel(locale, name));

                  return (
                    <tr key={leader.profile_id}>
                      <td className="px-4 py-3">
                        <bdi className="font-medium text-ink">
                          {leader.profiles?.full_name ?? "—"}
                        </bdi>
                        <span className="block max-w-60 truncate text-xs text-ink-subtle">
                          {leader.gender === "male" ? `${t.male} · ` : leader.gender === "female" ? `${t.female} · ` : ""}
                          <bdi>{leader.faculty}</bdi>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-muted">
                        {committees.length > 0 ? (
                          <span className="flex flex-wrap gap-1">
                            {committees.map((name) => (
                              <span
                                key={name}
                                className="whitespace-nowrap rounded-full bg-brand-50 px-2 py-0.5 text-xs
                                           font-medium text-brand-800"
                              >
                                {name}
                              </span>
                            ))}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-muted">
                        {workCommittees.length > 0 ? (
                          <span className="flex flex-wrap gap-1">
                            {workCommittees.map((name) => (
                              <span
                                key={name}
                                className="whitespace-nowrap rounded-full bg-butter/60 px-2 py-0.5 text-xs
                                           font-medium text-forest"
                              >
                                {name}
                              </span>
                            ))}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink">
                        {ageFromDateOfBirth(leader.date_of_birth) ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                        {formatDate(leader.date_of_birth, dateLocale)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-muted" dir="ltr">
                        <span className="block rtl:text-right">{leader.personal_phone}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-muted" dir="ltr">
                        <span className="block rtl:text-right">{leader.national_id}</span>
                      </td>
                      <td className="px-4 py-3 text-ink-muted">
                        <span className="block text-xs">
                          {STATUS_LABELS[leader.applicant_status] ??
                            leader.applicant_status}
                          {leader.academic_year ? ` · ${leader.academic_year}` : ""}
                        </span>
                        <span className="block max-w-48 truncate text-xs text-ink-subtle">
                          <bdi>{leader.university}</bdi>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                        {leader.leadership_years}{" "}
                        <span className="text-xs text-ink-subtle">
                          {t.years(leader.leadership_years)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                        {leader.join_year}
                      </td>
                      <td className="px-4 py-3">
                        {leader.id_card_path ? (
                          <ViewDocumentButton
                            path={leader.id_card_path}
                            filename={leader.profiles?.full_name ?? "leader"}
                            label="id-card"
                          />
                        ) : (
                          <span className="text-xs text-ink-subtle">{s.missing}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
  );
}
