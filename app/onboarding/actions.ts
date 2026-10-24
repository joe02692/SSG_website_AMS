"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dal";
import { ROLE_LABELS } from "@/lib/roles";
import { getLocale } from "@/lib/i18n/server";
import { localizeState } from "@/lib/i18n/onboarding";
import { notifyRegistrationComplete } from "@/lib/email";
import { deleteObject } from "@/lib/b2";
import { DOCUMENT_LABELS, fileDocument, leaderFolder, scoutFolder } from "@/lib/storage-paths";
import {
  APPLICANT_STATUSES,
  LEADER_COMMITTEES,
  MAX_ANSWER_LENGTH,
  RELATIONSHIPS,
  SCOUT_STAGES,
  usesParentDetails,
  usesScoutDetails,
} from "@/lib/onboarding";

export type DetailsState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  notice?: string;
  /** checkDetailsAction only: every answer is fine, the document may upload. */
  ok?: boolean;
  /** Children only: the saved child's id (new on the first save). */
  childId?: string;
};

/**
 * Who a scout_details row is for. "self" = the signed-in scout's own row.
 * "child" = a child on a parent's account (0025): a new one when childId is
 * null, otherwise one the parent already looks after (RLS checks that).
 */
type ScoutTarget =
  | { kind: "self" }
  | { kind: "child"; guardianId: string; childId: string | null };

const EGYPT_MOBILE = /^01[0-9]{9}$/;
const NATIONAL_ID = /^[0-9]{14}$/;

function field(formData: FormData, key: string): string {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

/** Arabic-Indic and Persian digits → 0-9, so "٠١٠…" from an Arabic keyboard is accepted. */
function latinDigits(value: string): string {
  return value
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** Phone numbers and national IDs: digits only, Latin, no spaces or dashes. */
function digitsField(formData: FormData, key: string): string {
  return latinDigits(field(formData, key)).replace(/[\s-]/g, "");
}

/**
 * The browser says a new document is chosen but not uploaded yet: it waits
 * for checkDetailsAction to approve every other answer first (DetailsForm).
 */
function documentPending(formData: FormData, name: string): boolean {
  return formData.get(`${name}__pending`) === "1";
}

/**
 * Is this national ID already someone else's — as a scout OR a leader?
 * (public.national_id_taken, migration 0024.) Asked before anything is
 * uploaded or saved. If 0024 isn't there yet this says "no" and the unique
 * index on each table still refuses a duplicate on save.
 */
async function nationalIdTaken(nationalId: string, exclude?: string | null): Promise<boolean> {
  if (!nationalId) return false;
  const supabase = await createClient();
  // The two-argument form (0025) skips the child being edited.
  const { data, error } = exclude
    ? await supabase.rpc("national_id_taken", { p_national_id: nationalId, p_exclude: exclude })
    : await supabase.rpc("national_id_taken", { p_national_id: nationalId });
  if (error) return false;
  return data === true;
}

const DUPLICATE_ID = "This national ID is already registered to another member.";

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

  // 42501 is insufficient_privilege, and it covers TWO different problems that
  // need different fixes — so the raw message goes in the sentence:
  //   "permission denied for table X"        → the GRANT is missing
  //   "violates row-level security policy"   → the policy is missing or wrong
  // Saying only "it's an RLS problem" sends you to fix the half that is fine.
  if (error.code === "42501") {
    return `The database refused this write (42501: ${error.message ?? "no message"}). "permission denied for table" means a GRANT is missing; "row-level security policy" means a policy is. Migration 0015 repairs both.`;
  }

  return `Could not save your details — the database said: ${error.code ?? "unknown"}: ${error.message ?? "no message"}`;
}

// ---------------------------------------------------------------------------
// Scouts — real columns, real constraints
// ---------------------------------------------------------------------------
async function saveScoutDetails(
  profileId: string,
  fullName: string | null,
  formData: FormData,
  markComplete: boolean,
  checkOnly = false,
  target: ScoutTarget = { kind: "self" },
): Promise<DetailsState> {
  const fieldErrors: Record<string, string> = {};
  const isChild = target.kind === "child";
  const childId = target.kind === "child" ? target.childId : null;

  // A child has no login, so their name is a question on the form. A linked
  // scout (who has their own login) keeps the name on their own profile.
  let existingChild: { id: string; profile_id: string | null; document_path: string | null; full_name: string | null } | null = null;
  if (childId) {
    const lookup = await createClient();
    const { data } = await lookup
      .from("scout_details")
      .select("id, profile_id, document_path, full_name, profiles:profile_id(full_name)")
      .eq("id", childId)
      .maybeSingle();
    if (!data) return { error: "That child isn't linked to your account." };
    const row = data as unknown as {
      id: string;
      profile_id: string | null;
      document_path: string | null;
      full_name: string | null;
      profiles: { full_name: string | null } | null;
    };
    existingChild = {
      id: row.id,
      profile_id: row.profile_id,
      document_path: row.document_path,
      full_name: row.profiles?.full_name ?? row.full_name,
    };
  }
  const childHasLogin = Boolean(existingChild?.profile_id);
  const childName = isChild && !childHasLogin ? field(formData, "full_name") : null;
  if (isChild && !childHasLogin) {
    if (!childName) fieldErrors.full_name = "Please enter your child's full name.";
    else if (childName.length > 120) fieldErrors.full_name = "Keep it under 120 characters.";
  }
  // The name the document is filed under.
  const fileName = isChild ? (childHasLogin ? existingChild?.full_name ?? null : childName) : fullName;

  const dateOfBirth = field(formData, "date_of_birth");
  const address = field(formData, "address");
  const personalPhone = digitsField(formData, "personal_phone");
  const parentPhone = digitsField(formData, "parent_phone");
  const stageCode = field(formData, "stage_code");
  const nationalId = digitsField(formData, "national_id");
  const documentPath = field(formData, "document_path");
  const documentWaiting = documentPending(formData, "document_path");

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
  // key in a hidden input; this is the key, not the file. Whether it really
  // belongs to this member is checked when it is filed, below.
  if (!documentPath && !(checkOnly && documentWaiting)) {
    fieldErrors.document_path = "Please upload the birth certificate.";
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

  // One national ID per person across the whole site (0024).
  if (
    !fieldErrors.national_id &&
    nationalId &&
    (await nationalIdTaken(nationalId, childId))
  ) {
    fieldErrors.national_id = DUPLICATE_ID;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, error: "Please fix the highlighted answers." };
  }
  // Everything checks out: the browser may now upload the document.
  if (checkOnly) return { ok: true };

  if (isChild) {
    return writeChild({
      guardianId: (target as { guardianId: string }).guardianId,
      existing: existingChild,
      childName,
      fileName,
      documentPath,
      stageCode,
      row: {
        date_of_birth: dateOfBirth,
        address,
        personal_phone: personalPhone,
        parent_phone: parentPhone,
        national_id: nationalId || null,
        stage_id: stageId as number,
      },
    });
  }

  // File the certificate as Members/Scouts/<Stage>/<Full name> - Birth
  // certificate.<ext>. Also runs when
  // the member only changed their stage, so the file follows them.
  const { data: current } = await supabase
    .from("scout_details")
    .select("document_path")
    .eq("profile_id", profileId)
    .maybeSingle();
  const filed = await fileDocument({
    submitted: documentPath,
    stored: (current as { document_path?: string | null } | null)?.document_path ?? null,
    profileId,
    folder: scoutFolder(stageCode),
    fullName,
    label: DOCUMENT_LABELS.scout,
  }).catch((error: unknown) => {
    console.error("[onboarding] could not file the certificate in Backblaze", error);
    return { error: "Could not store the certificate. Please try again." };
  });
  if ("error" in filed) {
    return {
      fieldErrors: { document_path: filed.error },
      error: "Please fix the highlighted answers.",
    };
  }

  const row = {
    profile_id: profileId,
    date_of_birth: dateOfBirth,
    address,
    personal_phone: personalPhone,
    parent_phone: parentPhone,
    national_id: nationalId || null,
    stage_id: stageId,
    document_path: filed.key,
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
        fieldErrors: { national_id: DUPLICATE_ID },
        error: "Please fix the highlighted answers.",
      };
    }
    console.error("[onboarding] could not save scout details", error);
    return {
      error: describeSaveError(error, "scout_details", "0010_scout_details.sql"),
    };
  }

  // The row now points at the filed copy; the upload and any older copy can go.
  await Promise.all(filed.cleanup.map(deleteObject));

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
// Children on a parent's account (migration 0025)
// ---------------------------------------------------------------------------
async function writeChild({
  guardianId,
  existing,
  childName,
  fileName,
  documentPath,
  stageCode,
  row,
}: {
  guardianId: string;
  existing: { id: string; profile_id: string | null; document_path: string | null } | null;
  childName: string | null;
  fileName: string | null;
  documentPath: string;
  stageCode: string;
  row: {
    date_of_birth: string;
    address: string;
    personal_phone: string;
    parent_phone: string;
    national_id: string | null;
    stage_id: number;
  };
}): Promise<DetailsState> {
  const supabase = await createClient();

  // Filed like any scout's certificate. The upload sits in the PARENT's
  // temporary folder (they uploaded it), so that is the ownership check.
  const filed = await fileDocument({
    submitted: documentPath,
    stored: existing?.document_path ?? null,
    profileId: guardianId,
    folder: scoutFolder(stageCode),
    fullName: fileName,
    label: DOCUMENT_LABELS.scout,
  }).catch((error: unknown) => {
    console.error("[children] could not file the certificate in Backblaze", error);
    return { error: "Could not store the certificate. Please try again." };
  });
  if ("error" in filed) {
    return {
      fieldErrors: { document_path: filed.error },
      error: "Please fix the highlighted answers.",
    };
  }

  const values = {
    ...row,
    document_path: filed.key,
    document_uploaded_at: new Date().toISOString(),
  };

  let childId = existing?.id ?? null;
  let error;
  if (existing) {
    ({ error } = await supabase
      .from("scout_details")
      .update(existing.profile_id ? values : { ...values, full_name: childName })
      .eq("id", existing.id));
  } else {
    // A new child. The id is made here because the row can't be read back in
    // the same request: the parent's read access comes from the guardianship
    // that the insert itself creates (trigger link_added_child, 0025).
    childId = randomUUID();
    ({ error } = await supabase.from("scout_details").insert({
      ...values,
      id: childId,
      profile_id: null,
      added_by: guardianId,
      full_name: childName,
    }));
  }

  if (error) {
    if (error.code === "23505") {
      return {
        fieldErrors: { national_id: DUPLICATE_ID },
        error: "Please fix the highlighted answers.",
      };
    }
    if (error.code === "PGRST204" || error.code === "42703" || error.code === "PGRST205") {
      return { error: "Parent accounts need migration 0025 in Supabase first." };
    }
    console.error("[children] could not save a child", error);
    return { error: describeSaveError(error, "scout_details", "0025_parents_and_children.sql") };
  }

  await Promise.all(filed.cleanup.map(deleteObject));
  revalidatePath("/dashboard", "layout");
  return {
    notice: existing ? "Your details have been saved." : "Child added.",
    childId: childId ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// A parent's own details (migration 0025)
// ---------------------------------------------------------------------------
async function saveParentDetails(
  profileId: string,
  formData: FormData,
  markComplete: boolean,
  checkOnly: boolean,
): Promise<DetailsState> {
  const fieldErrors: Record<string, string> = {};
  const phone = digitsField(formData, "phone");
  const relationship = field(formData, "relationship");
  const consent = formData.getAll("consent").includes("yes");

  if (!EGYPT_MOBILE.test(phone)) fieldErrors.phone = "11 digits, starting 01.";
  if (!RELATIONSHIPS.some((option) => option.value === relationship)) {
    fieldErrors.relationship = "Choose father, mother or other guardian.";
  }
  if (!consent) fieldErrors.consent = "Please tick the box to give your consent.";

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, error: "Please fix the highlighted answers." };
  }
  if (checkOnly) return { ok: true };

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("parent_details")
    .select("consent_at")
    .eq("profile_id", profileId)
    .maybeSingle();

  const { error } = await supabase.from("parent_details").upsert(
    {
      profile_id: profileId,
      phone,
      relationship,
      // Kept from the first time they agreed.
      consent_at:
        (current as { consent_at?: string } | null)?.consent_at ?? new Date().toISOString(),
    },
    { onConflict: "profile_id" },
  );
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") {
      return { error: "Parent accounts need migration 0025 in Supabase first." };
    }
    console.error("[onboarding] could not save parent details", error);
    return { error: describeSaveError(error, "parent_details", "0025_parents_and_children.sql") };
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
  fullName: string | null,
  formData: FormData,
  markComplete: boolean,
  checkOnly = false,
): Promise<DetailsState> {
  const fieldErrors: Record<string, string> = {};

  const dateOfBirth = field(formData, "date_of_birth");
  const personalPhone = digitsField(formData, "personal_phone");
  const nationalId = digitsField(formData, "national_id");
  const idCardPath = field(formData, "id_card_path");
  const idCardWaiting = documentPending(formData, "id_card_path");
  const gender = field(formData, "gender");
  const applicantStatus = field(formData, "applicant_status");
  const university = field(formData, "university");
  const faculty = field(formData, "faculty");
  const academicYear = field(formData, "academic_year");
  const joinYearRaw = field(formData, "join_year");
  const leadershipYearsRaw = field(formData, "leadership_years");

  // getAll, not get: the committees are repeated checkbox inputs sharing one
  // name, which is how a many-to-many arrives over a form post.
  const committeeCodes = formData
    .getAll("committee_codes")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  // Work committees (media, training, …) — optional, and kept apart from the
  // stages above. Stored as a list on leader_details (migration 0020).
  const committees = [
    ...new Set(
      formData
        .getAll("committees")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];

  const today = new Date();

  const born = new Date(dateOfBirth);
  if (!dateOfBirth || Number.isNaN(born.getTime())) {
    fieldErrors.date_of_birth = "Enter a valid date.";
  } else if (born > today) {
    fieldErrors.date_of_birth = "That date is in the future.";
  } else if (born < new Date("1900-01-01")) {
    fieldErrors.date_of_birth = "That date looks wrong.";
  }

  // Year only — most leaders remember the year they joined, not the day.
  // The trigger from migration 0020 enforces the same two rules.
  const joinYear = Number(joinYearRaw);
  if (!joinYearRaw || !Number.isInteger(joinYear) || joinYear < 1900) {
    fieldErrors.join_year = "Choose the year you joined.";
  } else if (joinYear > today.getFullYear()) {
    fieldErrors.join_year = "That year is in the future.";
  } else if (!Number.isNaN(born.getTime()) && joinYear < born.getFullYear()) {
    fieldErrors.join_year = "You cannot have joined before you were born.";
  }

  if (!EGYPT_MOBILE.test(personalPhone)) {
    fieldErrors.personal_phone = "11 digits, starting 01.";
  }

  // Required for leaders, unlike scouts — the spec marks it NOT NULL UNIQUE.
  if (!NATIONAL_ID.test(nationalId)) {
    fieldErrors.national_id = "A national ID is exactly 14 digits.";
  }

  if (!idCardPath && !(checkOnly && idCardWaiting)) {
    fieldErrors.id_card_path = "Please upload a photo of your ID card.";
  }

  if (gender !== "male" && gender !== "female") {
    fieldErrors.gender = "Choose male or female.";
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
    fieldErrors.academic_year = "Choose your academic year, or write it under Other.";
  } else if (academicYear.length > 50) {
    // The column is varchar(50) (0014).
    fieldErrors.academic_year = "Keep it under 50 characters.";
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
    fieldErrors.committee_codes = "Tick at least one stage.";
  } else if (committeeCodes.some((code) => !allowedCommittees.includes(code))) {
    fieldErrors.committee_codes = "Choose from the listed stages.";
  }

  const allowedWorkCommittees = LEADER_COMMITTEES.map((c) => c.value);
  if (committees.some((code) => !allowedWorkCommittees.includes(code))) {
    fieldErrors.committees = "Choose from the listed committees.";
  }

  for (const [key, value] of [
    ["university", university],
    ["faculty", faculty],
  ] as const) {
    if (value.length > MAX_ANSWER_LENGTH) {
      fieldErrors[key] = `Keep it under ${MAX_ANSWER_LENGTH} characters.`;
    }
  }

  // One national ID per person across the whole site (0024).
  if (!fieldErrors.national_id && (await nationalIdTaken(nationalId))) {
    fieldErrors.national_id = DUPLICATE_ID;
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
  // Everything checks out: the browser may now upload the ID card.
  if (checkOnly) return { ok: true };

  // File the ID card as Members/Leaders/<Males|Females>/<Full name> - ID
  // card.<ext>. Runs on
  // every save, so a corrected gender or name moves the file too.
  const { data: current } = await supabase
    .from("leader_details")
    .select("id_card_path")
    .eq("profile_id", profileId)
    .maybeSingle();
  const filed = await fileDocument({
    submitted: idCardPath,
    stored: (current as { id_card_path?: string | null } | null)?.id_card_path ?? null,
    profileId,
    folder: leaderFolder(gender),
    fullName,
    label: DOCUMENT_LABELS.leader,
  }).catch((error: unknown) => {
    console.error("[onboarding] could not file the ID card in Backblaze", error);
    return { error: "Could not store the ID card photo. Please try again." };
  });
  if ("error" in filed) {
    return {
      fieldErrors: { id_card_path: filed.error },
      error: "Please fix the highlighted answers.",
    };
  }

  const { error } = await supabase.from("leader_details").upsert(
    {
      profile_id: profileId,
      date_of_birth: dateOfBirth,
      personal_phone: personalPhone,
      national_id: nationalId,
      id_card_path: filed.key,
      gender,
      id_card_uploaded_at: new Date().toISOString(),
      applicant_status: applicantStatus,
      university,
      faculty,
      // NULL for graduates. The CHECK constraint refuses a graduate with a
      // year set, so an empty string would fail the write.
      academic_year: isStudent ? academicYear : null,
      leadership_years: leadershipYears,
      join_year: joinYear,
      committees,
    },
    { onConflict: "profile_id" },
  );

  if (error) {
    if (error.code === "23505") {
      return {
        fieldErrors: { national_id: DUPLICATE_ID },
        error: "Please fix the highlighted answers.",
      };
    }
    console.error("[onboarding] could not save leader details", error);
    return {
      error: describeSaveError(error, "leader_details", "0021_leader_gender.sql"),
    };
  }

  // The row now points at the filed copy; the upload and any older copy can go.
  await Promise.all(filed.cleanup.map(deleteObject));

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
  checkOnly = false,
): Promise<DetailsState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "You need to be signed in." };

  // Which set of answers this is comes from the member's stored role, never
  // from the submitted form.
  if (usesParentDetails(profile.role)) {
    return saveParentDetails(profile.id, formData, markComplete, checkOnly);
  }
  return usesScoutDetails(profile.role)
    ? saveScoutDetails(profile.id, profile.full_name, formData, markComplete, checkOnly)
    : saveLeaderDetails(profile.id, profile.full_name, formData, markComplete, checkOnly);
}

/**
 * Checks every answer WITHOUT saving or filing anything. The form calls this
 * before uploading a newly chosen document, so nothing reaches Backblaze
 * while any detail is still wrong. The real save checks everything again.
 */
export async function checkDetailsAction(
  _prevState: DetailsState,
  formData: FormData,
): Promise<DetailsState> {
  return localizeState(await saveDetails(formData, false, true), await getLocale());
}

/** Onboarding: save and let the member through to the dashboard. */
export async function completeOnboardingAction(
  _prevState: DetailsState,
  formData: FormData,
): Promise<DetailsState> {
  const result = await saveDetails(formData, true);
  if (result.error) return localizeState(result, await getLocale());

  // Tell the admins, but not on the member's time.
  //
  // after() runs once the response has been sent, so a slow or unreachable
  // Resend never delays somebody finishing registration. Awaiting the send
  // here would put a network round trip between "Save" and the dashboard, and
  // firing it without awaiting at all risks the serverless function being torn
  // down mid-request. Does nothing when Resend isn't configured.
  const profile = await getCurrentProfile();
  if (profile) {
    after(async () => {
      await notifyRegistrationComplete({
        fullName: profile.full_name,
        roleLabel: ROLE_LABELS[profile.role],
        profileId: profile.id,
      });
    });
  }

  // redirect() throws a control-flow exception; nothing after it runs.
  redirect("/dashboard");
}

/** Profile page: update the same answers later, without re-onboarding. */
export async function updateDetailsAction(
  _prevState: DetailsState,
  formData: FormData,
): Promise<DetailsState> {
  return localizeState(await saveDetails(formData, false), await getLocale());
}

/** A parent saves one child (add or edit) — or, with `check`, only checks. */
async function saveChild(formData: FormData, check: boolean): Promise<DetailsState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "You need to be signed in." };
  if (!usesParentDetails(profile.role)) return { error: "Only parent accounts can link a child." };
  const rawId = field(formData, "child_id");
  return saveScoutDetails(profile.id, null, formData, false, check, {
    kind: "child",
    guardianId: profile.id,
    childId: /^[0-9a-f-]{36}$/i.test(rawId) ? rawId : null,
  });
}

/** Parent: add or update a child. */
export async function saveChildAction(
  _prevState: DetailsState,
  formData: FormData,
): Promise<DetailsState> {
  const result = await saveChild(formData, false);
  // A new child: carry on to their page, where the parent can see it saved.
  if (!result.error && !result.fieldErrors && !field(formData, "child_id") && result.childId) {
    redirect(`/dashboard/children/${result.childId}?added=1`);
  }
  return localizeState(result, await getLocale());
}

/** Parent: check a child's answers before the certificate uploads. */
export async function checkChildAction(
  _prevState: DetailsState,
  formData: FormData,
): Promise<DetailsState> {
  return localizeState(await saveChild(formData, true), await getLocale());
}
