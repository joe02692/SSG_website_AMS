"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dal";
import {
  APPLICANT_STATUSES,
  MAX_ANSWER_LENGTH,
  SCOUT_STAGES,
  usesScoutDetails,
} from "@/lib/onboarding";

export type DetailsState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  notice?: string;
};

const EGYPT_MOBILE = /^01[0-9]{9}$/;
const NATIONAL_ID = /^[0-9]{14}$/;

function field(formData: FormData, key: string): string {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * Turns a Postgres/PostgREST error into something a person can act on.
 *
 * "Could not save your details. Please try again." was the message here, and
 * it is worse than useless: the database says precisely what is wrong, and
 * hiding that behind an invitation to repeat a failing action costs an
 * afternoon every time. The same mistake already cost one on the birth
 * certificate. Codes are included deliberately — this is a members-only app
 * for a scout group, not a public product, and a code someone can paste to me
 * is worth more than a soothing sentence.
 */
function describeSaveError(
  error: { code?: string; message?: string; details?: string } | null,
  table: string,
  migration: string,
): string {
  if (!error) return "Could not save your details. Please try again.";

  // The table isn't there. PGRST205 is PostgREST failing to find it in its
  // schema cache; 42P01 is Postgres's own undefined_table.
  if (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    (error.message ?? "").includes(`relation "public.${table}" does not exist`) ||
    (error.message ?? "").includes(`Could not find the table 'public.${table}'`)
  ) {
    return `The ${table} table doesn't exist in this database yet. Run supabase/migrations/${migration} in the Supabase SQL editor, then try again.`;
  }

  // A column is missing — the migration ran, but an older version of it.
  if (error.code === "PGRST204" || error.code === "42703") {
    return `This database is missing a column that ${migration} adds (${error.message ?? "unknown column"}). Re-run supabase/migrations/${migration}.`;
  }

  // A CHECK constraint refused the row. Name it: they are all documented in
  // the migration, so the name points straight at the rule that fired.
  if (error.code === "23514") {
    return `The database rejected one of the answers (${error.message ?? "check constraint"}).`;
  }

  // RLS refused the write.
  if (error.code === "42501") {
    return "The database refused this write for your account. This is a row-level-security policy problem, not something you did wrong.";
  }

  return `Could not save your details — the database said: ${error.code ?? "unknown"}: ${error.message ?? "no message"}`;
}

// ---------------------------------------------------------------------------
// Scouts — real columns, real constraints
// ---------------------------------------------------------------------------
async function saveScoutDetails(
  profileId: string,
  formData: FormData,
  markComplete: boolean,
): Promise<DetailsState> {
  const fieldErrors: Record<string, string> = {};

  const dateOfBirth = field(formData, "date_of_birth");
  const address = field(formData, "address");
  const personalPhone = field(formData, "personal_phone").replace(/\s/g, "");
  const parentPhone = field(formData, "parent_phone").replace(/\s/g, "");
  const stageCode = field(formData, "stage_code");
  const nationalId = field(formData, "national_id").replace(/\s/g, "");
  const documentPath = field(formData, "document_path");

  // Date of birth — the database also refuses future dates, but a clear
  // message here beats a constraint violation.
  const born = new Date(dateOfBirth);
  if (!dateOfBirth || Number.isNaN(born.getTime())) {
    fieldErrors.date_of_birth = "Enter a valid date.";
  } else if (born > new Date()) {
    fieldErrors.date_of_birth = "That date is in the future.";
  } else if (born < new Date("1900-01-01")) {
    fieldErrors.date_of_birth = "That date looks wrong.";
  }

  if (!address) {
    fieldErrors.address = "Please enter your address.";
  } else if (address.length > MAX_ANSWER_LENGTH) {
    fieldErrors.address = `Keep it under ${MAX_ANSWER_LENGTH} characters.`;
  }

  if (!EGYPT_MOBILE.test(personalPhone)) {
    fieldErrors.personal_phone = "11 digits, starting 01.";
  }
  if (!EGYPT_MOBILE.test(parentPhone)) {
    fieldErrors.parent_phone = "11 digits, starting 01.";
  }

  // Optional, but must be well formed when given.
  if (nationalId && !NATIONAL_ID.test(nationalId)) {
    fieldErrors.national_id = "A national ID is exactly 14 digits.";
  }

  // The browser already uploaded the file to Backblaze and put the resulting
  // key in a hidden input; this is the key, not the file. Checking the prefix
  // is what stops a crafted submission from claiming someone else's document:
  // the key was minted server-side as `<profile_id>/…`, so anything outside
  // this member's own prefix cannot have come from us.
  if (!documentPath) {
    fieldErrors.document_path = "Please upload the birth certificate.";
  } else if (!documentPath.startsWith(`${profileId}/`)) {
    fieldErrors.document_path = "That file doesn't belong to your account.";
  }

  const supabase = await createClient();

  // Resolve the stage code to its id. Reading it from the table (rather than
  // trusting a number from the form) means a bad or renamed code fails here
  // instead of writing a dangling reference.
  let stageId: number | null = null;
  if (!stageCode) {
    fieldErrors.stage_code = "Choose your stage.";
  } else {
    const { data: stage } = await supabase
      .from("stages")
      .select("id")
      .eq("code", stageCode)
      .single();
    if (!stage) fieldErrors.stage_code = "Choose one of the listed stages.";
    else stageId = stage.id;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, error: "Please fix the highlighted answers." };
  }

  const row = {
    profile_id: profileId,
    date_of_birth: dateOfBirth,
    address,
    personal_phone: personalPhone,
    parent_phone: parentPhone,
    national_id: nationalId || null,
    stage_id: stageId,
    document_path: documentPath,
    document_uploaded_at: new Date().toISOString(),
  };

  let { error } = await supabase
    .from("scout_details")
    .upsert(row, { onConflict: "profile_id" });

  // If document_uploaded_at is missing (migration 0013 never run), PostgREST
  // rejects the whole insert before Postgres sees it — which would block
  // registration entirely over an informational timestamp. Retry without it.
  // 0014 adds the column, so this should never fire after that migration; it
  // is here because this exact failure has already cost a day once.
  if (
    (error?.code === "PGRST204" || error?.code === "42703") &&
    (error?.message ?? "").includes("document_uploaded_at")
  ) {
    console.error(
      "[onboarding] scout_details.document_uploaded_at is missing — run supabase/migrations/0014_leader_details.sql",
    );
    const { document_uploaded_at: _omitted, ...withoutTimestamp } = row;
    ({ error } = await supabase
      .from("scout_details")
      .upsert(withoutTimestamp, { onConflict: "profile_id" }));
  }

  if (error) {
    // 23505 is a unique violation, and national_id is the only unique column
    // a member controls.
    if (error.code === "23505") {
      return {
        fieldErrors: {
          national_id: "That national ID is already registered.",
        },
        error: "Please fix the highlighted answers.",
      };
    }
    console.error("[onboarding] could not save scout details", error);
    return {
      error: describeSaveError(error, "scout_details", "0010_scout_details.sql"),
    };
  }

  if (markComplete) {
    await supabase
      .from("profiles")
      .update({ details_completed_at: new Date().toISOString() })
      .eq("id", profileId);
  }

  revalidatePath("/", "layout");
  return { notice: "Your details have been saved." };
}

// ---------------------------------------------------------------------------
// Staff — real columns in leader_details, from the DBMS team's spec.
//
// Was: five placeholder answers merged into the profiles.details JSONB blob.
// Now the same shape as the scouts path — typed columns, database constraints
// behind every field, and the committees written to a junction table.
// ---------------------------------------------------------------------------
async function saveLeaderDetails(
  profileId: string,
  formData: FormData,
  markComplete: boolean,
): Promise<DetailsState> {
  const fieldErrors: Record<string, string> = {};

  const dateOfBirth = field(formData, "date_of_birth");
  const personalPhone = field(formData, "personal_phone").replace(/\s/g, "");
  const nationalId = field(formData, "national_id").replace(/\s/g, "");
  const idCardPath = field(formData, "id_card_path");
  const applicantStatus = field(formData, "applicant_status");
  const university = field(formData, "university");
  const faculty = field(formData, "faculty");
  const academicYear = field(formData, "academic_year");
  const joinDate = field(formData, "join_date");
  const leadershipYearsRaw = field(formData, "leadership_years");

  // getAll, not get: the committees are repeated checkbox inputs sharing one
  // name, which is how a many-to-many arrives over a form post.
  const committeeCodes = formData
    .getAll("committee_codes")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  const today = new Date();

  const born = new Date(dateOfBirth);
  if (!dateOfBirth || Number.isNaN(born.getTime())) {
    fieldErrors.date_of_birth = "Enter a valid date.";
  } else if (born > today) {
    fieldErrors.date_of_birth = "That date is in the future.";
  } else if (born < new Date("1900-01-01")) {
    fieldErrors.date_of_birth = "That date looks wrong.";
  }

  const joined = new Date(joinDate);
  if (!joinDate || Number.isNaN(joined.getTime())) {
    fieldErrors.join_date = "Enter a valid date.";
  } else if (joined > today) {
    fieldErrors.join_date = "That date is in the future.";
  } else if (!Number.isNaN(born.getTime()) && joined < born) {
    fieldErrors.join_date = "You cannot have joined before you were born.";
  }

  if (!EGYPT_MOBILE.test(personalPhone)) {
    fieldErrors.personal_phone = "11 digits, starting 01.";
  }

  // Required for leaders, unlike scouts — the spec marks it NOT NULL UNIQUE.
  if (!NATIONAL_ID.test(nationalId)) {
    fieldErrors.national_id = "A national ID is exactly 14 digits.";
  }

  if (!idCardPath) {
    fieldErrors.id_card_path = "Please upload a photo of your ID card.";
  } else if (!idCardPath.startsWith(`${profileId}/`)) {
    fieldErrors.id_card_path = "That file doesn't belong to your account.";
  }

  const allowedStatuses = APPLICANT_STATUSES.map((option) => option.value);
  if (!allowedStatuses.includes(applicantStatus)) {
    fieldErrors.applicant_status = "Choose one of the listed options.";
  }

  if (!university) fieldErrors.university = "Please enter your university.";
  if (!faculty) fieldErrors.faculty = "Please enter your faculty.";

  // The database enforces this pairing too (leader_details_academic_year_
  // matches_status). Checking it here turns a constraint violation into a
  // message pointing at the field that caused it.
  const isStudent = applicantStatus === "university_student";
  if (isStudent && !academicYear) {
    fieldErrors.academic_year = "Students need to give an academic year.";
  }

  const leadershipYears = Number(leadershipYearsRaw);
  if (
    !leadershipYearsRaw ||
    !Number.isInteger(leadershipYears) ||
    leadershipYears < 0 ||
    leadershipYears > 70
  ) {
    fieldErrors.leadership_years = "Enter a whole number of years, 0 to 70.";
  }

  const allowedCommittees = SCOUT_STAGES.map((stage) => stage.value);
  if (committeeCodes.length === 0) {
    fieldErrors.committee_codes = "Tick at least one stage or committee.";
  } else if (committeeCodes.some((code) => !allowedCommittees.includes(code))) {
    fieldErrors.committee_codes = "Choose from the listed stages.";
  }

  for (const [key, value] of [
    ["university", university],
    ["faculty", faculty],
    ["academic_year", academicYear],
  ] as const) {
    if (value.length > MAX_ANSWER_LENGTH) {
      fieldErrors[key] = `Keep it under ${MAX_ANSWER_LENGTH} characters.`;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, error: "Please fix the highlighted answers." };
  }

  const supabase = await createClient();

  // Codes resolved to ids from the table, not trusted as numbers from the
  // form — the same rule the scouts path uses for stage_code.
  const { data: stages } = await supabase
    .from("stages")
    .select("id, code")
    .in("code", committeeCodes);

  const stageIds = (stages ?? []).map((stage) => stage.id);
  if (stageIds.length !== committeeCodes.length) {
    return {
      fieldErrors: { committee_codes: "Choose from the listed stages." },
      error: "Please fix the highlighted answers.",
    };
  }

  const { error } = await supabase.from("leader_details").upsert(
    {
      profile_id: profileId,
      date_of_birth: dateOfBirth,
      personal_phone: personalPhone,
      national_id: nationalId,
      id_card_path: idCardPath,
      id_card_uploaded_at: new Date().toISOString(),
      applicant_status: applicantStatus,
      university,
      faculty,
      // NULL for graduates. The CHECK constraint refuses a graduate with a
      // year set, so an empty string would fail the write.
      academic_year: isStudent ? academicYear : null,
      leadership_years: leadershipYears,
      join_date: joinDate,
    },
    { onConflict: "profile_id" },
  );

  if (error) {
    if (error.code === "23505") {
      return {
        fieldErrors: { national_id: "That national ID is already registered." },
        error: "Please fix the highlighted answers.",
      };
    }
    console.error("[onboarding] could not save leader details", error);
    return {
      error: describeSaveError(error, "leader_details", "0014_leader_details.sql"),
    };
  }

  // Replace the committee set rather than merge it: unticking a box has to
  // mean something. Delete-then-insert is safe here because RLS scopes both
  // statements to this member's own rows.
  await supabase.from("leader_committees").delete().eq("profile_id", profileId);
  const { error: committeeError } = await supabase
    .from("leader_committees")
    .insert(stageIds.map((stageId) => ({ profile_id: profileId, stage_id: stageId })));

  if (committeeError) {
    console.error("[onboarding] could not save committees", committeeError);
    return {
      error: `Your details saved, but the committees did not. ${describeSaveError(committeeError, "leader_committees", "0014_leader_details.sql")}`,
    };
  }

  if (markComplete) {
    await supabase
      .from("profiles")
      .update({ details_completed_at: new Date().toISOString() })
      .eq("id", profileId);
  }

  revalidatePath("/", "layout");
  return { notice: "Your details have been saved." };
}

async function saveDetails(
  formData: FormData,
  markComplete: boolean,
): Promise<DetailsState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "You need to be signed in." };

  // Which set of answers this is comes from the member's stored role, never
  // from the submitted form.
  return usesScoutDetails(profile.role)
    ? saveScoutDetails(profile.id, formData, markComplete)
    : saveLeaderDetails(profile.id, formData, markComplete);
}

/** Onboarding: save and let the member through to the dashboard. */
export async function completeOnboardingAction(
  _prevState: DetailsState,
  formData: FormData,
): Promise<DetailsState> {
  const result = await saveDetails(formData, true);
  if (result.error) return result;
  // redirect() throws a control-flow exception; nothing after it runs.
  redirect("/dashboard");
}

/** Profile page: update the same answers later, without re-onboarding. */
export async function updateDetailsAction(
  _prevState: DetailsState,
  formData: FormData,
): Promise<DetailsState> {
  return saveDetails(formData, false);
}
