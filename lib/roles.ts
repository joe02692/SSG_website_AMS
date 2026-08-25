/** Mirrors the public.user_role enum in Postgres. */
export const ROLES = ["scout", "leader", "parent"] as const;

export type Role = (typeof ROLES)[number];

/** Roles a visitor may choose for themselves at signup. */
export const SELF_SERVE_ROLES = ["scout", "parent"] as const;

export const ROLE_LABELS: Record<Role, string> = {
  scout: "Scout",
  leader: "Leader",
  parent: "Parent / Guardian",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  scout: "A member of the group taking part in meetings and camps.",
  leader: "Runs sections, manages records and approves members.",
  parent: "A parent or guardian following a scout in the group.",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
