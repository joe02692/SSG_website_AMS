import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SITE_ADMIN_ROLES, type Role } from "@/lib/roles";

export type Profile = {
  id: string;
  full_name: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
};

/**
 * The Data Access Layer.
 *
 * Every authorisation decision in the AMS should go through this file.
 * proxy.ts only performs an optimistic cookie check for redirect ergonomics;
 * it is not a security boundary, and Server Actions are reachable by direct
 * POST without ever passing through a page render.
 *
 * `cache()` dedupes these calls within a single request, so calling
 * getCurrentUser() in a layout and again in a page costs one round trip.
 */

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  // getUser() verifies the JWT against the auth server on every call.
  // getSession() merely decodes the cookie — never trust it for access control.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at, updated_at")
    .eq("id", user.id)
    .single();

  if (error) return null;
  return data as Profile;
});

/** Redirects to /login when there is no signed-in user. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Redirects unless the signed-in member is site-level staff. */
export async function requireSiteAdmin(): Promise<Profile> {
  return requireRole(...SITE_ADMIN_ROLES);
}

/** Redirects unless the signed-in member is the head site admin. */
export async function requireHeadSiteAdmin(): Promise<Profile> {
  return requireRole("head_site_admin");
}

/** Redirects unless the signed-in member holds one of `roles`. */
export async function requireRole(...roles: Role[]): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!roles.includes(profile.role)) redirect("/dashboard?denied=1");
  return profile;
}
