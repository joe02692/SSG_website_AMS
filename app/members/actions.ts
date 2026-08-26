"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dal";

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
 * Every action here re-checks the role server-side. The RLS policies on
 * leader_invites would block a non-leader anyway — this check just turns a
 * silent database refusal into an honest error message.
 */
async function requireLeader() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "leader") return null;
  return profile;
}

// ---------------------------------------------------------------------------
// Mint a new leader invite
// ---------------------------------------------------------------------------
export async function createInviteAction(
  _prevState: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const leader = await requireLeader();
  if (!leader) return { error: "Only leaders can create invite codes." };

  const rawNote = formData.get("note");
  const note =
    typeof rawNote === "string" ? rawNote.trim().slice(0, 200) : "";

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
    created_by: leader.id,
    expires_at: expiresAt,
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
// Revoke an unused invite
// ---------------------------------------------------------------------------
export async function revokeInviteAction(formData: FormData): Promise<void> {
  const leader = await requireLeader();
  if (!leader) return;

  const code = formData.get("code");
  if (typeof code !== "string" || !code) return;

  const supabase = await createClient();
  // Only unused codes can be revoked — used ones stay as an audit trail of
  // who joined with which invite.
  await supabase
    .from("leader_invites")
    .delete()
    .eq("code", code)
    .is("used_by", null);

  revalidatePath("/members");
}
