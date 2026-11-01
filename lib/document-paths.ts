import "server-only";

import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * Points a member's row at their filed document (migration 0027).
 *
 * scout_details.document_path and leader_details.id_card_path can no longer
 * be set from a member's own session: if they could, anyone could point their
 * row at another member's file and then view, copy or delete it through the
 * site. So the server writes the path with the service role, and only after
 * fileDocument() has checked that the upload belongs to the person saving.
 *
 * Callers write every OTHER column through the member's own session first, so
 * row-level security still decides whose row it is.
 */
export async function setDocumentPath(
  table: "scout_details" | "leader_details",
  match: { column: "id" | "profile_id"; value: string },
  key: string,
): Promise<{ error?: string }> {
  const values =
    table === "scout_details"
      ? { document_path: key, document_uploaded_at: new Date().toISOString() }
      : { id_card_path: key, id_card_uploaded_at: new Date().toISOString() };

  let admin;
  try {
    admin = createAdminSupabase();
  } catch (cause) {
    console.error("[documents] SUPABASE_SERVICE_ROLE_KEY is missing", cause);
    return { error: "missing-service-role" };
  }

  const { error } = await admin.from(table).update(values).eq(match.column, match.value);
  if (error) {
    console.error(`[documents] could not record the ${table} document path`, error);
    return { error: error.code ?? "unknown" };
  }
  return {};
}
