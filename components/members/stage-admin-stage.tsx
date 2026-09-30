"use client";

import { SCOUT_STAGES } from "@/lib/onboarding";
import { STAGE_ADMIN_LIMIT } from "@/lib/roles";
import { useLocale, useT } from "@/lib/i18n/client";
import { fill } from "@/lib/i18n/fill";

export type StageAdminsByStage = Record<string, { id: string; name: string }[]>;

/**
 * The stage picker shown when the head admin makes someone a Stage Admin,
 * with the group's reminder: two stage admins per stage. It warns, it does
 * not block — the head admin decides.
 */
export function StageAdminStage({
  memberId,
  name,
  value,
  onChange,
  stageAdmins,
}: {
  memberId: string;
  name: string;
  value: string;
  onChange: (code: string) => void;
  stageAdmins: StageAdminsByStage;
}) {
  const all = useT();
  const locale = useLocale();
  const t = all.members.stageAdmins;
  // Everyone already running the chosen stage, not counting this person.
  const others = (stageAdmins[value] ?? []).filter((a) => a.id !== memberId);
  const full = value !== "" && others.length >= STAGE_ADMIN_LIMIT;

  return (
    <div className="flex w-full flex-col items-end gap-1">
      <select
        name="stage"
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={t.stageFor(name)}
        className="rounded-lg border border-line-strong bg-surface-raised px-2 py-1 text-xs text-ink"
      >
        <option value="">{t.chooseStage}</option>
        {SCOUT_STAGES.map((stage) => (
          <option key={stage.value} value={stage.value}>
            {all.stages[stage.value as keyof typeof all.stages]}
          </option>
        ))}
      </select>
      {full ? (
        <p
          role="status"
          className="max-w-64 rounded-md border border-warning-line bg-warning-surface px-2 py-1 text-end text-xs text-warning-ink"
        >
          {fill(
            t.full(all.stages[value as keyof typeof all.stages]),
            others.map((a, i) => (
              <span key={a.id}>
                {i > 0 ? (locale === "ar" ? "، " : ", ") : null}
                <bdi>{a.name}</bdi>
              </span>
            )),
          )}
        </p>
      ) : null}
    </div>
  );
}
