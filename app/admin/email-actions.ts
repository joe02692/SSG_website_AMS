"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/dal";
import { isHeadSiteAdminRole } from "@/lib/roles";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getT } from "@/lib/i18n/server";

export type ConfirmEmailState = { error?: string; notice?: string };

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Marks a member's email address as confirmed, by hand (validation feedback,
 * 17 Nov 2026): for someone whose confirmation email never arrived or went to
 * spam. Head site admin only. Changes nothing else about the account.
 */
export async function confirmEmailAction(_prev: ConfirmEmailState, formData: FormData): Promise<ConfirmEmailState> {
  const t = (await getT()).members.confirmEmail;
  const viewer = await getCurrentProfile();
  if (!viewer || !isHeadSiteAdminRole(viewer.role)) return { error: t.notAllowed };

  const memberId = formData.get("memberId");
  if (typeof memberId !== "string" || !UUID.test(memberId)) return { error: t.failed };

  let admin;
  try {
    admin = createAdminSupabase();
  } catch {
    return { error: t.failed };
  }

  const { data: found, error: readError } = await admin.auth.admin.getUserById(memberId);
  if (readError || !found.user) return { error: t.gone };
  if (found.user.email_confirmed_at) return { notice: t.already };

  const { error } = await admin.auth.admin.updateUserById(memberId, { email_confirm: true });
  if (error) {
    console.error("[admin] could not confirm email", error);
    return { error: t.failed };
  }
  revalidatePath("/admin");
  return { notice: t.done };
}
