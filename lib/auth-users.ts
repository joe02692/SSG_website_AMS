import "server-only";

import { createAdminSupabase } from "@/lib/supabase/admin";

export type AuthUserInfo = { email: string | null; confirmed: boolean };

/**
 * Every account's email address and whether it has been confirmed, by
 * profile id — for the Admin members table (search by email, "Confirm email").
 * These live in auth.users, which only the service role can read. Returns an
 * empty map if the key is missing or Supabase can't be reached, so the page
 * still renders.
 */
export async function getAuthUserInfo(maxPages = 5): Promise<Map<string, AuthUserInfo>> {
  const out = new Map<string, AuthUserInfo>();
  let admin;
  try {
    admin = createAdminSupabase();
  } catch {
    return out;
  }
  for (let page = 1; page <= maxPages; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      console.error("[auth-users] could not list", error);
      break;
    }
    for (const user of data.users) {
      out.set(user.id, { email: user.email ?? null, confirmed: Boolean(user.email_confirmed_at) });
    }
    if (data.users.length < 1000) break;
  }
  return out;
}
