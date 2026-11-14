import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { requireHeadSiteAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { SCOUT_STAGES } from "@/lib/onboarding";
import { getPublicLeaders, getStageInfoRows } from "@/lib/leaders";
import { AdminLeaderButton, StageInfoForm } from "@/components/admin/stage-info-form";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).features.adminStages.metaTitle };
}

type Seat = { stage_code: string; title: "leader" | "assistant"; profile_id: string; full_name: string | null };

/**
 * Admin → Stages (head site admin only): the text in each stage's pop-up on
 * /stages, who holds each stage leader / assistant seat, and which leaders
 * show a public profile.
 */
export default async function AdminStagesPage() {
  await requireHeadSiteAdmin();
  const all = await getT();
  const t = all.features.adminStages;
  const supabase = await createClient();
  const [info, seatsResult, stagesResult, leaders] = await Promise.all([
    getStageInfoRows(),
    supabase.rpc("stage_title_holders"),
    supabase.from("stages").select("id, code"),
    getPublicLeaders(),
  ]);
  const seats = (seatsResult.data ?? []) as Seat[];
  const stageIds = Object.fromEntries(((stagesResult.data ?? []) as { id: number; code: string }[]).map((s) => [s.code, s.id]));
  const stageName = (code: string) => all.stages[code as keyof typeof all.stages] ?? code;
  const missing = Boolean(seatsResult.error);

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <Link href="/admin" className="text-sm text-brand-ink underline-offset-4 hover:underline">
          <span aria-hidden className="inline-block rtl:-scale-x-100">←</span> {t.back}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{t.title}</h1>
        <p className="mt-2 text-ink-muted">{t.intro}</p>

        {missing ? (
          <p className="mt-6 rounded-lg border border-warning-line bg-warning-surface px-3 py-2.5 text-sm text-warning-ink">{t.missing}</p>
        ) : null}

        <section aria-labelledby="stage-text-heading" className="mt-8">
          <h2 id="stage-text-heading" className="text-xl font-semibold tracking-tight text-ink">{t.textHeading}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t.textIntro}</p>
          <div className="mt-4 space-y-3">
            {SCOUT_STAGES.map((stage) => {
              const row = info[stage.value];
              const values: Record<string, string> = {};
              if (row) for (const [k, v] of Object.entries(row)) if (typeof v === "string") values[k] = v;
              const stageSeats = seats.filter((s) => s.stage_code === stage.value);
              return (
                <details key={stage.value} className="rounded-xl border border-line bg-surface-raised">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 p-4 font-semibold text-forest">
                    <span className="flex-1">{stageName(stage.value)}</span>
                    <span className="text-xs font-normal text-ink-muted">
                      {t.seatLine(
                        stageSeats.find((s) => s.title === "leader")?.full_name ?? t.vacant,
                        stageSeats.find((s) => s.title === "assistant")?.full_name ?? t.vacant,
                      )}
                    </span>
                  </summary>
                  <div className="border-t border-line">
                    {stageSeats.length > 0 ? (
                      <ul className="flex flex-wrap gap-3 px-4 pt-4 text-sm sm:px-5">
                        {stageSeats.map((seat) => (
                          <li key={seat.title} className="flex items-center gap-2 rounded-lg bg-surface px-3 py-1.5">
                            <span>
                              {seat.title === "leader" ? t.seatLeader : t.seatAssistant}: <bdi className="font-semibold">{seat.full_name}</bdi>
                            </span>
                            <AdminLeaderButton
                              kind="free"
                              stageId={stageIds[stage.value]}
                              profileId={seat.profile_id}
                              label={t.freeSeat}
                              question={t.freeSeatQuestion(seat.full_name ?? "")}
                            />
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <StageInfoForm stage={stage.value} values={values} />
                  </div>
                </details>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="public-leaders-heading" className="mt-10">
          <h2 id="public-leaders-heading" className="text-xl font-semibold tracking-tight text-ink">{t.profilesHeading}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t.profilesIntro}</p>
          {leaders.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">{t.noProfiles}</p>
          ) : (
            <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface-raised">
              {leaders.map((leader) => (
                <li key={leader.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <Link href={`/leaders/${leader.id}`} className="min-w-0 flex-1 font-semibold text-brand-ink underline-offset-4 hover:underline">
                    <bdi>{leader.name}</bdi>
                  </Link>
                  <span className="text-xs text-ink-muted">{leader.stages.map(stageName).join(" · ")}</span>
                  <AdminLeaderButton kind="hide" profileId={leader.id} label={t.hide} question={t.hideQuestion(leader.name)} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </SiteShell>
  );
}
