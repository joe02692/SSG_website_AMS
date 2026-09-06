import { ageFromDateOfBirth } from "@/lib/onboarding";
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
  join_date: string;
  profiles: { full_name: string | null; role: string } | null;
  leader_committees: { stages: { name_en: string; name_ar: string } | null }[] | null;
};

const STATUS_LABELS: Record<string, string> = {
  university_student: "Student",
  graduate: "Graduate",
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", {
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
export function LeadersTable({ rows }: { rows: LeaderRow[] }) {
  return (
          <div className="mt-6 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-250 text-left text-sm">
              <thead className="border-b border-line bg-surface text-xs uppercase tracking-wider text-ink-subtle">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Stages / committees
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Age
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Born
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Phone
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    National ID
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Study
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Leading
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Joined
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    ID card
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface-raised">
                {rows.map((leader) => {
                  const committees = (leader.leader_committees ?? [])
                    .map((link) => link.stages?.name_en)
                    .filter(Boolean);

                  return (
                    <tr key={leader.profile_id}>
                      <td className="px-4 py-3">
                        <span className="font-medium text-ink">
                          {leader.profiles?.full_name ?? "—"}
                        </span>
                        <span className="block max-w-60 truncate text-xs text-ink-subtle">
                          {leader.faculty}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-muted">
                        {committees.length > 0 ? (
                          <span className="flex flex-wrap gap-1">
                            {committees.map((name) => (
                              <span
                                key={name}
                                className="whitespace-nowrap rounded-full bg-brand-50 px-2 py-0.5 text-xs
                                           font-medium text-brand-800 dark:bg-brand-950 dark:text-brand-200"
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
                        {formatDate(leader.date_of_birth)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-muted">
                        {leader.personal_phone}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-muted">
                        {leader.national_id}
                      </td>
                      <td className="px-4 py-3 text-ink-muted">
                        <span className="block text-xs">
                          {STATUS_LABELS[leader.applicant_status] ??
                            leader.applicant_status}
                          {leader.academic_year ? ` · ${leader.academic_year}` : ""}
                        </span>
                        <span className="block max-w-48 truncate text-xs text-ink-subtle">
                          {leader.university}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                        {leader.leadership_years}{" "}
                        <span className="text-xs text-ink-subtle">
                          {leader.leadership_years === 1 ? "year" : "years"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                        {formatDate(leader.join_date)}
                      </td>
                      <td className="px-4 py-3">
                        {leader.id_card_path ? (
                          <ViewDocumentButton
                            path={leader.id_card_path}
                            filename={leader.profiles?.full_name ?? "leader"}
                            label="id-card"
                          />
                        ) : (
                          <span className="text-xs text-ink-subtle">Missing</span>
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
