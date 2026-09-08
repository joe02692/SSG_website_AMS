"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/dal";
import { ROLE_LABELS } from "@/lib/roles";
import {
  isAssignableRole,
  isHeadSiteAdminRole,
  isPendingRole,
  type AssignableRole,
} from "@/lib/roles";

/* The invite-code actions lived here — createInviteAction, deleteInviteAction
 * and the code generator. Leader access is now requested and approved, so
 * there is nothing to mint. The leader_invites table survives as a record of
 * how the current leaders joined; see migration 0017. */

export type DeleteState = { error?: string };

/**
 * Turns a PostgREST/Postgres error from an admin-client write into a sentence
 * that names the actual cause.
 *
 * Same policy as describeSaveError() in app/onboarding/actions.ts, and it
 * exists for the same reason: on 8 Sep 2026 approving a leader returned
 * "42501: permission denied for table profiles" and it took a database replay
 * to work out that `service_role` had never been granted anything — every
 * GRANT in this repo targets `authenticated`. Nothing before this reached a
 * table with the service key, so nobody had noticed. The database said exactly
 * what was wrong; the app just passed the code through without saying what it
 * meant.
 */
function describeAdminWriteError(
  error: { code?: string; message: string },
  what: string,
): string {
  const code = error.code ?? "unknown";

  // 42501 from a service-role write is a missing GRANT, essentially always.
  // RLS does not apply — service_role bypasses it — so there is only one gate
  // left that can refuse, and it is the one migration 0018 opens.
  if (code === "42501") {
    return `Could not ${what}: the database refused the write (42501). The service role has no permission on that table — run migration 0018_service_role_grants.sql in the Supabase SQL editor.`;
  }
  // The column exists in the code but not in the database.
  if (code === "PGRST204" || code === "42703") {
    return `Could not ${what}: ${error.message} That column is missing — run migrations 0016 and 0017 (separately, in that order).`;
  }
  if (code === "PGRST205" || code === "42P01") {
    return `Could not ${what}: ${error.message} That table is missing — check which migrations have been applied.`;
  }
  return `Could not ${what} (${code}: ${error.message}).`;
}


/**
 * The gate on every action in this file.
 *
 * Returns the profile so callers can compare ids — several of these refuse to
 * act on the admin's own account, and doing that needs to know who they are,
 * not merely that they are allowed.
 */
async function requireHeadAdmin() {
  const profile = await getCurrentProfile();
  if (!isHeadSiteAdminRole(profile?.role)) return null;
  return profile;
}

/**
 * Permanently removes an account.
 *
 * This is the one operation a member session cannot perform: deleting a row
 * from auth.users needs the service role key. Deleting the auth user cascades
 * to their profile; any invite code they redeemed keeps its used_at stamp, so
 * the code stays spent (see migration 0005).
 *
 * Irreversible — there is no undo and no soft-delete tombstone. If you later
 * want "remove their access but keep the person on the roster", that's a
 * different action: set role to 'scout' instead of calling this.
 */
export async function deleteMemberAction(
  _prevState: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  const admin = await requireHeadAdmin();
  if (!admin) return { error: "Only the head site admin can delete accounts." };

  const memberId = formData.get("memberId");
  if (typeof memberId !== "string" || !memberId) {
    return { error: "Nothing to delete." };
  }

  // Deleting yourself would leave the group with no head site admin and no
  // way back in except SQL.
  if (memberId === admin.id) {
    return { error: "You can't delete your own account." };
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", memberId)
    .single();

  if (!target) return { error: "That member no longer exists." };

  // Belt and braces: even though only the head admin reaches this line, one
  // head admin must not be able to remove another.
  if (target.role === "head_site_admin") {
    return { error: "Head site admin accounts can't be deleted from here." };
  }

  // createAdminSupabase() throws when SUPABASE_SERVICE_ROLE_KEY is missing.
  // Letting that escape turns a misconfigured environment into a 500 that
  // takes the whole page down, so catch it and say what's actually wrong.
  let adminClient;
  try {
    adminClient = createAdminSupabase();
  } catch {
    return {
      error:
        "Deleting accounts isn't configured on this deployment — SUPABASE_SERVICE_ROLE_KEY is missing.",
    };
  }

  const { error } = await adminClient.auth.admin.deleteUser(memberId);

  if (error) {
    return { error: "Could not delete that account. Please try again." };
  }

  revalidatePath("/members");
  return {};
}

export type RecoveryLinkState = {
  error?: string;
  /** The one-time link, shown once so it can be copied and sent. */
  link?: string;
  /** Who it belongs to, so a crowded table can't be misread. */
  forName?: string;
};

/**
 * Mints a one-time password-recovery link for another member.
 *
 * Why this exists: password reset normally arrives by email, and this project
 * has no working mailer until the group buys a domain (Resend cannot send to
 * arbitrary recipients without a verified one — see Tasks/email-setup.md).
 * Until then a member who forgets their password has no way back into their
 * account at all.
 *
 * Deliberately a LINK and not a password. An admin setting a temporary
 * password means an admin knows a member's password, and temporary passwords
 * get reused, written down and pasted into group chats. A recovery link is
 * single-use, expires on its own, and nobody — including the head admin —
 * learns the member's actual credentials. The admin passes it on however they
 * already talk to that person.
 *
 * This stays useful after the domain arrives: someone whose email bounces or
 * who mistyped their address still needs a route back.
 *
 * Head site admin only. It is, in effect, temporary access to someone else's
 * account, so it sits with the same person who can delete accounts and mint
 * invite codes — not with every site admin.
 */
export async function createRecoveryLinkAction(
  _prevState: RecoveryLinkState,
  formData: FormData,
): Promise<RecoveryLinkState> {
  const admin = await requireHeadAdmin();
  if (!admin) {
    return { error: "Only the head site admin can issue recovery links." };
  }

  const memberId = formData.get("memberId");
  if (typeof memberId !== "string" || !memberId) {
    return { error: "No member selected." };
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", memberId)
    .single();

  if (!target) return { error: "That member no longer exists." };

  // One head admin must not be able to take over another's account. Mirrors
  // the same guard on deleteMemberAction.
  if (target.role === "head_site_admin" && target.id !== admin.id) {
    return { error: "You can't issue a recovery link for another head admin." };
  }

  let adminClient;
  try {
    adminClient = createAdminSupabase();
  } catch {
    return {
      error:
        "Recovery links aren't configured on this deployment — SUPABASE_SERVICE_ROLE_KEY is missing.",
    };
  }

  // The email address is the one on auth.users, not anything submitted — the
  // form only ever carries a profile id.
  const { data: userData, error: lookupError } =
    await adminClient.auth.admin.getUserById(memberId);

  const email = userData?.user?.email;
  if (lookupError || !email) {
    console.error("[recovery] could not read the member's email", lookupError);
    return { error: "Could not find an email address for that member." };
  }

  const site =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://ssg-website-ams.vercel.app";

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  const hashedToken = data?.properties?.hashed_token;
  if (error || !hashedToken) {
    console.error("[recovery] could not generate a link", error);
    return {
      error: `Could not create a recovery link (${error?.code ?? error?.message ?? "unknown"}).`,
    };
  }

  // Built from hashed_token, NOT from properties.action_link.
  //
  // action_link points at Supabase's own /auth/v1/verify, which on success
  // redirects with the session in the URL *fragment* (#access_token=…).
  // A fragment never reaches the server, so our /auth/confirm route would see
  // neither a code nor a token_hash and bounce the member to
  // /login?error=invalid_confirmation_link — a link that looks right and
  // always fails.
  //
  // Pointing at our own route with token_hash instead means verifyOtp() runs
  // server-side, the session cookie is set properly, and the member lands on
  // /reset-password ready to choose a password. That is the second flow
  // app/auth/confirm/route.ts already documents and handles.
  const link = new URL("/auth/confirm", site);
  link.searchParams.set("token_hash", hashedToken);
  link.searchParams.set("type", "recovery");
  link.searchParams.set("next", "/reset-password");

  // Not logged, not stored, not revalidated into a cache — returned once, to
  // the admin who asked, and then it is gone from the server's side.
  return {
    link: link.toString(),
    forName: target.full_name ?? "this member",
  };
}


export type ReviewState = { error?: string; notice?: string };

/**
 * Approves a pending leader request and assigns their role.
 *
 * Why this runs through the service role rather than an ordinary query:
 * prevent_role_escalation() (migration 0004) raises on ANY change to
 * profiles.role coming from a client connection, and it checks the JWT claim
 * as well as current_user — so even a SECURITY DEFINER function called by a
 * signed-in admin is refused. That guard is the thing standing between a
 * member and self-promotion, so the answer is to satisfy it honestly, not to
 * weaken it: the service role is a different connection, and the authorisation
 * decision lives here, in code that has already established who is asking.
 *
 * The role comes from a fixed list that excludes head_site_admin. There is
 * exactly one head admin, set by hand in SQL, and no approval — however
 * malformed the request — can mint a second.
 */
export async function approveRequestAction(
  _prevState: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const admin = await requireHeadAdmin();
  if (!admin) return { error: "Only the head site admin can approve requests." };

  const memberId = formData.get("memberId");
  const role = formData.get("role");

  if (typeof memberId !== "string" || !memberId) {
    return { error: "No request selected." };
  }
  if (!isAssignableRole(role)) {
    return { error: "Choose a role to give them." };
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", memberId)
    .single();

  if (!target) return { error: "That request no longer exists." };
  if (!isPendingRole(target.role)) {
    return { error: "That account has already been reviewed." };
  }

  let adminClient;
  try {
    adminClient = createAdminSupabase();
  } catch {
    return {
      error:
        "Approvals aren't configured on this deployment — SUPABASE_SERVICE_ROLE_KEY is missing.",
    };
  }

  const { error } = await adminClient
    .from("profiles")
    .update({
      role: role as AssignableRole,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", memberId)
    // Re-checking the role in the WHERE clause closes the gap between reading
    // the row above and writing it here: two admins approving at once cannot
    // both succeed.
    .eq("role", "pending_leader");

  if (error) {
    console.error("[requests] could not approve", error);
    return { error: describeAdminWriteError(error, "approve that request") };
  }

  revalidatePath("/members");
  return {
    notice: `${target.full_name ?? "That member"} is now a ${ROLE_LABELS[role]}.`,
  };
}

/**
 * Rejects a request by deleting the account outright.
 *
 * This is what was chosen over keeping a rejected record, and it is worth
 * knowing what it costs: nothing stops the same person signing up again the
 * next minute, and there is no trace that they were already refused. The UI
 * therefore asks twice, because this cannot be undone.
 */
export async function rejectRequestAction(
  _prevState: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const admin = await requireHeadAdmin();
  if (!admin) return { error: "Only the head site admin can reject requests." };

  const memberId = formData.get("memberId");
  if (typeof memberId !== "string" || !memberId) {
    return { error: "No request selected." };
  }
  if (memberId === admin.id) return { error: "That's your own account." };

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", memberId)
    .single();

  if (!target) return { error: "That request no longer exists." };
  // Only ever deletes an unapproved account. Without this check the same
  // action could be pointed at an established leader.
  if (!isPendingRole(target.role)) {
    return { error: "That account has already been approved — delete it from the members table instead." };
  }

  let adminClient;
  try {
    adminClient = createAdminSupabase();
  } catch {
    return {
      error:
        "Rejections aren't configured on this deployment — SUPABASE_SERVICE_ROLE_KEY is missing.",
    };
  }

  const { error } = await adminClient.auth.admin.deleteUser(memberId);
  if (error) {
    console.error("[requests] could not delete", error);
    return { error: "Could not remove that account. Please try again." };
  }

  revalidatePath("/members");
  return { notice: `${target.full_name ?? "That request"} was rejected and removed.` };
}

/**
 * Changes an existing member's role.
 *
 * Same service-role path and the same fixed list as approval. Two guards worth
 * naming: the head admin cannot change their own role, because demoting
 * yourself leaves the group with no head admin and no way back except SQL; and
 * no other head admin can be touched from here.
 */
export async function changeRoleAction(
  _prevState: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const admin = await requireHeadAdmin();
  if (!admin) return { error: "Only the head site admin can change roles." };

  const memberId = formData.get("memberId");
  const role = formData.get("role");

  if (typeof memberId !== "string" || !memberId) return { error: "No member selected." };
  if (!isAssignableRole(role)) return { error: "Choose a role." };
  if (memberId === admin.id) {
    return { error: "You can't change your own role — that would lock you out." };
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", memberId)
    .single();

  if (!target) return { error: "That member no longer exists." };
  if (target.role === "head_site_admin") {
    return { error: "Head site admin accounts can't be changed from here." };
  }
  if (target.role === role) {
    return { notice: `${target.full_name ?? "They"} is already a ${ROLE_LABELS[role]}.` };
  }

  let adminClient;
  try {
    adminClient = createAdminSupabase();
  } catch {
    return {
      error:
        "Role changes aren't configured on this deployment — SUPABASE_SERVICE_ROLE_KEY is missing.",
    };
  }

  const { error } = await adminClient
    .from("profiles")
    .update({ role: role as AssignableRole })
    .eq("id", memberId);

  if (error) {
    console.error("[roles] could not change role", error);
    return { error: describeAdminWriteError(error, "change that role") };
  }

  revalidatePath("/members");
  return {
    notice: `${target.full_name ?? "That member"} is now a ${ROLE_LABELS[role]}.`,
  };
}
