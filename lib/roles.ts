/** Mirrors the public.user_role enum in Postgres. */
export const ROLES = [
  "scout",
  "parent",
  "stage_leader",
  "stage_admin",
  "site_admin",
  "head_site_admin",
  // Legacy: the single leader role that predated the stage split. Migration
  // 0003 moved every row off it, but the enum value survives (Postgres can't
  // drop one), so it stays in the type.
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
 * The staff hierarchy, least privileged first.
 *
 *   stage_leader     runs sessions for one stage
 *   stage_admin      oversees one stage
 *   site_admin       the website team — reads every member
 *   head_site_admin  one account — also issues invite codes
 *
 * stage_leader and stage_admin are still identical in permissions; the
 * distinction is recorded, not yet enforced.
 */
export const STAFF_ROLES = [
  "stage_leader",
  "stage_admin",
  "site_admin",
  "head_site_admin",
  "leader",
] as const;

/** Runs a scouting stage. Gets /dashboard/stage. */
export const STAGE_ROLES = ["stage_leader", "stage_admin"] as const;

/** Site-level staff. Gets the members list. */
export const SITE_ADMIN_ROLES = ["site_admin", "head_site_admin"] as const;

/**
 * Roles an invite code can grant.
 *
 * Deliberately excludes the site-level roles: whoever can mint a code must
 * not be able to mint site-level access. Those are assigned by hand, by
 * email, from the SQL editor.
 */
export const INVITABLE_ROLES = ["stage_admin", "stage_leader"] as const;

export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  scout: "Scout",
  parent: "Parent / Guardian",
  stage_leader: "Stage Leader",
  stage_admin: "Stage Admin",
  site_admin: "Site Admin",
  head_site_admin: "Head Site Admin",
  leader: "Leader",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  scout: "A member of the group taking part in meetings and camps.",
  parent: "A parent or guardian following a scout in the group.",
  stage_leader: "Runs sessions and activities for a stage.",
  stage_admin: "Oversees a stage — its members, records and season plan.",
  site_admin: "Manages the website and can view every member.",
  head_site_admin: "Runs the system and is the only account that issues invite codes.",
  leader: "Runs sections, manages records and approves members.",
};

export function isRole(value: unknown): value is Role {
  return (
    typeof value === "string" && (ROLES as readonly string[]).includes(value)
  );
}

/** Any non-member role. Mirrors public.is_staff(). */
export function isStaffRole(role: Role | null | undefined): boolean {
  return !!role && (STAFF_ROLES as readonly string[]).includes(role);
}

/** Runs a stage — sees /dashboard/stage. */
export function isStageRole(role: Role | null | undefined): boolean {
  return !!role && (STAGE_ROLES as readonly string[]).includes(role);
}

/** Site-level staff — sees the members list. Mirrors public.is_site_admin(). */
export function isSiteAdminRole(role: Role | null | undefined): boolean {
  return !!role && (SITE_ADMIN_ROLES as readonly string[]).includes(role);
}

/** The single head site admin. Mirrors public.is_head_site_admin(). */
export function isHeadSiteAdminRole(role: Role | null | undefined): boolean {
  return role === "head_site_admin";
}

export function isInvitableRole(value: unknown): value is InvitableRole {
  return (
    typeof value === "string" &&
    (INVITABLE_ROLES as readonly string[]).includes(value)
  );
}
