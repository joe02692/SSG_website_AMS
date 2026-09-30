import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Which stage each Stage Admin runs — profiles.admin_stage_id (migration
 * 0022), assigned by the head site admin and locked against self-edits.
 *
 * Both helpers degrade quietly when 0022 hasn't been run yet: the column is
 * missing, the query errors, and callers get "no stage" plus a flag they can
 * turn into a "run migration 0022" notice. Nothing else on the site breaks.
 */

type AdminStageRow = { id: string; full_name: string | null; admin_stage: { code: string } | null };

/** The stage code a stage admin runs, or null. */
export const adminStageCode = cache(
  async (profileId: string): Promise<{ code: string | null; migrationMissing: boolean }> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, admin_stage:admin_stage_id(code)")
      .eq("id", profileId)
      .maybeSingle();
    if (error) return { code: null, migrationMissing: true };
    return { code: (data as AdminStageRow | null)?.admin_stage?.code ?? null, migrationMissing: false };
  },
);

export type StageAdmin = { id: string; name: string };

/** Every stage admin, grouped by stage code. For the head admin's pages. */
export async function stageAdminsByStage(): Promise<{
  byStage: Record<string, StageAdmin[]>;
  byMember: Record<string, string>;
  migrationMissing: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, admin_stage:admin_stage_id(code)")
    .eq("role", "stage_admin")
    .limit(500);
  if (error) return { byStage: {}, byMember: {}, migrationMissing: true };

  const byStage: Record<string, StageAdmin[]> = {};
  const byMember: Record<string, string> = {};
  for (const row of (data ?? []) as unknown as AdminStageRow[]) {
    const code = row.admin_stage?.code;
    if (!code) continue;
    (byStage[code] ??= []).push({ id: row.id, name: row.full_name ?? "—" });
    byMember[row.id] = code;
  }
  return { byStage, byMember, migrationMissing: false };
}
