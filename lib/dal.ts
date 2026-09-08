import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SITE_ADMIN_ROLES, isPendingRole, type Role } from "@/lib/roles";

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
export type LeaderDetails = {
  profile_id: string;
  date_of_birth: string;
  personal_phone: string;
  national_id: string;
  id_card_path: string;
  applicant_status: string;
  university: string;
  faculty: string;
  academic_year: string | null;
  leadership_years: number;
  join_date: string;
  /** Stage codes joined through public.leader_committees. */
  committee_codes: string[];
};

/**
 * Registration details for a leader or site admin.
 *
 * Returns null for scouts, who have no row here — the mirror of
 * getScoutDetails() returning null for staff. Callers can fire both
 * speculatively and let the roles sort themselves out.
 */
export const getLeaderDetails = cache(async (): Promise<LeaderDetails | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leader_details")
    .select(
      "profile_id, date_of_birth, personal_phone, national_id, id_card_path, applicant_status, university, faculty, academic_year, leadership_years, join_date, leader_committees(stages(code))",
    )
    .eq("profile_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as Omit<LeaderDetails, "committee_codes"> & {
    leader_committees: { stages: { code: string } | null }[] | null;
  };

  return {
    ...row,
    committee_codes: (row.leader_committees ?? [])
      .map((link) => link.stages?.code)
      .filter((code): code is string => Boolean(code)),
  };
});

/**
 * Leader details as form answers.
 *
 * committee_codes is joined with commas because DetailsForm prefills a
 * checkbox group by splitting on them — the same string shape a text field
 * would carry, so the form needs no special case for "this answer is a list".
 */
export function leaderAnswers(
  details: LeaderDetails | null,
): Record<string, string> {
  if (!details) return {};
  return {
    date_of_birth: details.date_of_birth ?? "",
    personal_phone: details.personal_phone ?? "",
    national_id: details.national_id ?? "",
    id_card_path: details.id_card_path ?? "",
    applicant_status: details.applicant_status ?? "",
    university: details.university ?? "",
    faculty: details.faculty ?? "",
    academic_year: details.academic_year ?? "",
    leadership_years:
      details.leadership_years === null ? "" : String(details.leadership_years),
    join_date: details.join_date ?? "",
    committee_codes: details.committee_codes.join(","),
  };
}

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
/**
 * Sends a member with no approved role to the waiting page.
 *
 * Belt and braces rather than the only defence — `pending_leader` appears in
 * no role list, so isStaffRole, isSiteAdminRole and the RLS policies all
 * refuse it anyway. This exists so those accounts see an explanation instead
 * of an empty dashboard or a redirect loop, which reads as a broken site
 * rather than as "we have your request".
 */
export async function requireApproved(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (isPendingRole(profile.role)) redirect("/pending");
  return profile;
}

export async function requireCompletedDetails(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  // Approval comes before onboarding: an unapproved account has no business
  // filling in registration details.
  if (isPendingRole(profile.role)) redirect("/pending");
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
