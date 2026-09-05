import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SITE_ADMIN_ROLES, type Role } from "@/lib/roles";

export type Profile = {
  id: string;
  full_name: string | null;
  role: Role;
  /** Onboarding answers, keyed by question id from lib/onboarding.ts. */
  details: Record<string, string>;
  /** NULL until the member finishes the onboarding questions. */
  details_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export const PROFILE_COLUMNS =
  "id, full_name, role, details, details_completed_at, created_at, updated_at";

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
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .single();

  if (error) return null;
  return data as Profile;
});

export type ScoutDetails = {
  profile_id: string;
  date_of_birth: string;
  address: string;
  national_id: string | null;
  personal_phone: string;
  parent_phone: string;
  document_path: string | null;
  document_uploaded_at: string | null;
  stage_id: number;
  /** Joined from public.stages — the code the onboarding form uses. */
  stage_code: string | null;
};

/**
 * The signed-in scout's registration details, or null for staff (who have no
 * row) and for anyone who hasn't finished onboarding.
 */
export const getScoutDetails = cache(async (): Promise<ScoutDetails | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scout_details")
    .select(
      "profile_id, date_of_birth, address, national_id, personal_phone, parent_phone, document_path, document_uploaded_at, stage_id, stages(code)",
    )
    .eq("profile_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as Omit<ScoutDetails, "stage_code"> & {
    stages: { code: string } | { code: string }[] | null;
  };
  const joined = Array.isArray(row.stages) ? row.stages[0] : row.stages;

  return { ...row, stage_code: joined?.code ?? null };
});

/**
 * Reshapes a scout_details row into the flat answers map the onboarding form
 * expects, so the same form can prefill for editing.
 */
export function scoutAnswers(
  details: ScoutDetails | null,
): Record<string, string> {
  if (!details) return {};
  return {
    date_of_birth: details.date_of_birth ?? "",
    address: details.address ?? "",
    personal_phone: details.personal_phone ?? "",
    parent_phone: details.parent_phone ?? "",
    stage_code: details.stage_code ?? "",
    national_id: details.national_id ?? "",
  };
}

/** Redirects to /login when there is no signed-in user. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Sends the member to /onboarding until they've answered the signup
 * questions. Called from the dashboard layout so every page under it is
 * covered by one check.
 */
export async function requireCompletedDetails(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.details_completed_at) redirect("/onboarding");
  return profile;
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
