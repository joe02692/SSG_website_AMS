/** Mirrors the public.user_role enum in Postgres. */
export const ROLES = [
  "scout",
  "parent",
  "stage_admin",
  "stage_leader",
  // Legacy: the single leader role that predated the stage_admin /
  // stage_leader split. Migration 0003 moves every row off it, but the enum
  // value survives (Postgres can't drop one), so it stays in the type.
  "leader",
] as const;

export type Role = (typeof ROLES)[number];

/** Roles a visitor may choose for themselves at signup. */
export const SELF_SERVE_ROLES = ["scout"] as const;

/**
 * Roles shown in the signup UI but not open yet. Listed separately (rather
 * than removed) so the option still appears with a "Coming soon" badge —
 * and so the server can reject it explicitly instead of falling through to
 * the generic "choose how you're joining" error.
 */
export const COMING_SOON_ROLES = ["parent"] as const;

/**
 * Every role that carries leader-level access.
 *
 * stage_admin and stage_leader are deliberately identical in permissions for
 * now — the distinction is recorded but not yet enforced. When the two
 * diverge, narrow the checks at the call sites rather than widening this list.
 * Mirrors public.is_leader() in the database.
 */
export const LEADER_ROLES = ["stage_admin", "stage_leader", "leader"] as const;

/**
 * Note: member management and invite minting are NOT role-based — they belong
 * to the single group owner (`profiles.is_owner`), checked via `requireOwner()`
 * and the `is_owner()` RLS policies. stage_admin is a rank within the group,
 * not an administrative grant.
 */

/** Roles an invite code can grant. */
export const INVITABLE_ROLES = ["stage_admin", "stage_leader"] as const;

export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  scout: "Scout",
  parent: "Parent / Guardian",
  stage_admin: "Stage Admin",
  stage_leader: "Stage Leader",
  leader: "Leader",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  scout: "A member of the group taking part in meetings and camps.",
  parent: "A parent or guardian following a scout in the group.",
  stage_admin: "Oversees a stage — its members, records and season plan.",
  stage_leader: "Runs sessions and activities for a stage.",
  leader: "Runs sections, manages records and approves members.",
};

export function isRole(value: unknown): value is Role {
  return (
    typeof value === "string" && (ROLES as readonly string[]).includes(value)
  );
}

export function isLeaderRole(role: Role | null | undefined): boolean {
  return !!role && (LEADER_ROLES as readonly string[]).includes(role);
}

export function isInvitableRole(value: unknown): value is InvitableRole {
  return (
    typeof value === "string" &&
    (INVITABLE_ROLES as readonly string[]).includes(value)
  );
}
