import { createClient } from "@/lib/supabase/server";
import { getLocale, getT } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/config";
import { ScoutDecision } from "@/components/members/scout-decision";

type Request = {
  id: string;
  full_name: string | null;
  stage_code: string;
  age: number | null;
  address: string;
  personal_phone: string;
  parent_phone: string;
  has_document: boolean;
  review_status: "pending" | "approved" | "rejected";
  submitted_at: string;
  reviewed_at: string | null;
  reviewer: string | null;
};

/**
 * New scouts waiting for approval (migration 0029): on the Stage page for a
 * stage admin (his stage only) and on Admin for the head site admin (every
 * stage). The database decides which rows the viewer gets.
 */
export async function ScoutRequests({ showStage = false }: { showStage?: boolean }) {
  const all = await getT();
  const t = all.features.scoutApproval;
  const locale = await getLocale();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("scout_requests");
  const missing = Boolean(error);
  const rows = (data ?? []) as Request[];
  const pending = rows.filter((r) => r.review_status === "pending");
  const decided = rows.filter((r) => r.review_status !== "pending").slice(0, 10);
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(intlLocale(locale), { day: "numeric", month: "short", year: "numeric" });
  const stageName = (code: string) => all.stages[code as keyof typeof all.stages] ?? code;

  return (
    <section aria-labelledby="scout-requests-heading" className="mt-10">
      <h2 id="scout-requests-heading" className="flex items-center gap-2 text-xl font-semibold tracking-tight text-ink">
        {t.title}
        {pending.length > 0 ? (
          <span className="rounded-full bg-sun px-2.5 py-0.5 text-sm font-bold text-forest">{pending.length}</span>
        ) : null}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">{showStage ? t.introAll : t.introStage}</p>

      {missing ? (
        <p className="mt-4 rounded-lg border border-warning-line bg-warning-surface px-3 py-2.5 text-sm text-warning-ink">{t.missing}</p>
      ) : pending.length === 0 ? (
        <p className="mt-4 rounded-xl border-2 border-dashed border-line px-4 py-6 text-center text-sm text-ink-muted">{t.none}</p>
      ) : (
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {pending.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 rounded-2xl border-2 border-sun bg-surface-raised p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-forest">
                    <bdi>{r.full_name ?? "—"}</bdi>
                  </p>
                  <p className="text-xs text-ink-muted">{t.submitted(date(r.submitted_at))}</p>
                </div>
                {showStage ? (
                  <span className="rounded-full bg-forest px-3 py-1 text-xs font-bold text-sun">{stageName(r.stage_code)}</span>
                ) : null}
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Fact label={t.age} value={r.age !== null ? String(r.age) : "—"} />
                <Fact label={t.certificate} value={r.has_document ? t.uploaded : t.notUploaded} warn={!r.has_document} />
                <Fact label={t.phone} value={r.personal_phone} ltr />
                <Fact label={t.parentPhone} value={r.parent_phone} ltr />
                <div className="col-span-2">
                  <Fact label={t.address} value={r.address} />
                </div>
              </dl>
              <ScoutDecision id={r.id} name={r.full_name ?? ""} />
            </li>
          ))}
        </ul>
      )}

      {decided.length > 0 ? (
        <details className="mt-4 rounded-xl border border-line bg-surface-raised">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-ink">{t.recent(decided.length)}</summary>
          <ul className="divide-y divide-line border-t border-line text-sm">
            {decided.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                <bdi className="min-w-0 flex-1 font-medium text-ink">{r.full_name}</bdi>
                {showStage ? <span className="text-xs text-ink-muted">{stageName(r.stage_code)}</span> : null}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    r.review_status === "approved" ? "bg-success-surface text-success-ink" : "bg-danger-surface text-danger-ink"
                  }`}
                >
                  {r.review_status === "approved" ? t.statusApproved : t.statusRejected}
                </span>
                <span className="text-xs text-ink-muted">
                  {r.reviewer ? `${r.reviewer} · ` : ""}
                  {r.reviewed_at ? date(r.reviewed_at) : ""}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function Fact({ label, value, ltr = false, warn = false }: { label: string; value: string; ltr?: boolean; warn?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={`font-medium ${warn ? "text-danger-ink" : "text-ink"}`} dir={ltr ? "ltr" : undefined}>
        <bdi className="break-words">{value}</bdi>
      </dd>
    </div>
  );
}
