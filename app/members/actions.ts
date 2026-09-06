"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/dal";
import { isHeadSiteAdminRole, isInvitableRole } from "@/lib/roles";

export type InviteState = {
  error?: string;
  notice?: string;
  /** The freshly minted code, echoed back so the UI can display it big. */
  code?: string;
};

/**
 * Codes avoid 0/O/1/I/L so they survive being read out loud at a group
 * meeting or scribbled on paper.
 */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    if (i === 3) out += "-";
  }
  return `ELSALAM-${out}`;
}

/**
 * Issuing and revoking codes belongs to the head site admin alone — a site
 * admin can read the member list but must not be able to hand out staff
 * access. Re-checked here because Server Actions are reachable by direct
 * POST; the is_head_site_admin() RLS policy would refuse anyway, but this
 * turns a silent database rejection into an honest error message.
 */
async function requireHeadAdmin() {
  const profile = await getCurrentProfile();
  if (!isHeadSiteAdminRole(profile?.role)) return null;
  return profile;
}

// ---------------------------------------------------------------------------
// Mint a new leader invite
// ---------------------------------------------------------------------------
export async function createInviteAction(
  _prevState: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const admin = await requireHeadAdmin();
  if (!admin) {
    return { error: "Only the head site admin can create invite codes." };
  }

  const rawNote = formData.get("note");
  const note =
    typeof rawNote === "string" ? rawNote.trim().slice(0, 200) : "";

  const grantsRole = formData.get("grantsRole");
  if (!isInvitableRole(grantsRole)) {
    return { error: "Choose which kind of leader this code creates." };
  }

  const rawDays = formData.get("expiresDays");
  const days =
    typeof rawDays === "string" && rawDays !== "" ? Number(rawDays) : null;
  if (days !== null && (!Number.isInteger(days) || days < 1 || days > 365)) {
    return { error: "Choose a valid expiry." };
  }

  const code = generateCode();
  const expiresAt =
    days === null
      ? null
      : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const supabase = await createClient();
  const { error } = await supabase.from("leader_invites").insert({
    code,
    note: note || null,
    created_by: admin.id,
    expires_at: expiresAt,
    // The database reads this back in handle_new_user() to decide the role —
    // it is not re-derived from anything the new member sends at signup.
    grants_role: grantsRole,
  });

  if (error) {
    return { error: "Could not create the invite. Try again." };
  }

  revalidatePath("/members");
  return {
    notice: "Invite created. Share this code with the new leader:",
    code,
  };
}

// ---------------------------------------------------------------------------
// Delete an invite code
// ---------------------------------------------------------------------------
export type DeleteState = { error?: string };

/**
 * Removes a code row entirely — used or unused.
 *
 * An unused code: this is a straightforward revoke, and the code can never be
 * redeemed afterwards.
 *
 * A used code: the row is the only record of who joined with which invite, so
 * deleting it discards that link. The member's account is untouched — their
 * role already lives on their profile and does not depend on this row.
 *
 * Note the code string becomes free to mint again afterwards. That is not a
 * way to "recycle" codes and there is no need to: codes are 8 random
 * characters from a 31-character alphabet, so the supply is effectively
 * unlimited. Deleting is for tidiness, not capacity.
 */
export async function deleteInviteAction(
  _prevState: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  const admin = await requireHeadAdmin();
  if (!admin) return { error: "Only the head site admin can delete codes." };

  const code = formData.get("code");
  if (typeof code !== "string" || !code) return { error: "Nothing to delete." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("leader_invites")
    .delete()
    .eq("code", code);

  if (error) return { error: "Could not delete that code. Try again." };

  revalidatePath("/members");
  return {};
}

// ---------------------------------------------------------------------------
// Delete a member's account
// ---------------------------------------------------------------------------
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
