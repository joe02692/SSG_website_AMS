/** Mirrors the public.user_role enum in Postgres. */
export const ROLES = [
  "scout",
  "parent",
  "pending_leader",
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
 * Someone who has asked to lead and has not been approved.
 *
 * This role appears in no other list in this file, and that is the entire
 * security model behind it: isStaffRole, isStageRole and isSiteAdminRole all
 * return false, so a pending account has exactly the access of a stranger.
 * Adding it to any of those lists would grant access to anyone who can fill
 * in a signup form.
 */
export const PENDING_ROLE = "pending_leader" as const;

/** Roles shown in the signup UI but not open yet. Listed separately (rather
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
 *   head_site_admin  one account — approves requests and assigns roles
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
 * Roles the head site admin can assign — on approving a request, or when
 * changing an existing member's role.
 *
 * head_site_admin is deliberately absent. There is exactly one, it is set by
 * hand in the SQL editor, and keeping it out of this list means no bug in the
 * approval UI can ever mint a second one. `scout` is present so a leader who
 * steps down can be moved back rather than deleted.
 */
export const ASSIGNABLE_ROLES = [
  "site_admin",
  "stage_admin",
  "stage_leader",
  "scout",
] as const;

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  scout: "Scout",
  parent: "Parent / Guardian",
  pending_leader: "Awaiting approval",
  stage_leader: "Stage Leader",
  stage_admin: "Stage Admin",
  site_admin: "Site Admin",
  head_site_admin: "Head Site Admin",
  leader: "Leader",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  scout: "A member of the group taking part in meetings and camps.",
  parent: "A parent or guardian following a scout in the group.",
  pending_leader:
    "Has asked to join as a leader and is waiting for the head site admin to approve it. No access until then.",
  stage_leader: "Runs sessions and activities for a stage.",
  stage_admin: "Oversees a stage — its members, records and season plan.",
  site_admin: "Manages the website and can view every member.",
  head_site_admin:
    "Runs the system, approves leader requests and sets everyone\u2019s role.",
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

export function isAssignableRole(value: unknown): value is AssignableRole {
  return (
    typeof value === "string" &&
    (ASSIGNABLE_ROLES as readonly string[]).includes(value)
  );
}

/** Asked to lead, not yet approved. No access to anything. */
export function isPendingRole(role: Role | null | undefined): boolean {
  return role === PENDING_ROLE;
}
