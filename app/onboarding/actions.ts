"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dal";
import {
  MAX_ANSWER_LENGTH,
  questionsForRole,
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

  const { error } = await supabase.from("scout_details").upsert(
    {
      profile_id: profileId,
      date_of_birth: dateOfBirth,
      address,
      personal_phone: personalPhone,
      parent_phone: parentPhone,
      national_id: nationalId || null,
      stage_id: stageId,
    },
    { onConflict: "profile_id" },
  );

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
    return { error: "Could not save your details. Please try again." };
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
// Staff — still the placeholder questions, still JSONB
// ---------------------------------------------------------------------------
async function saveLeaderDetails(
  profileId: string,
  existing: Record<string, string>,
  formData: FormData,
  markComplete: boolean,
): Promise<DetailsState> {
  const questions = questionsForRole("stage_leader");
  const fieldErrors: Record<string, string> = {};
  const merged: Record<string, string> = { ...existing };

  for (const question of questions) {
    const answer = field(formData, question.id);

    if (!answer) {
      if (question.required) fieldErrors[question.id] = "This one is required.";
      delete merged[question.id];
      continue;
    }
    if (question.type === "select") {
      // A <select> only constrains the browser; check the value server-side.
      const allowed = (question.options ?? []).map((o) => o.value);
      if (!allowed.includes(answer)) {
        fieldErrors[question.id] = "Choose one of the listed options.";
        continue;
      }
    } else if (answer.length > MAX_ANSWER_LENGTH) {
      fieldErrors[question.id] =
        `Keep it under ${MAX_ANSWER_LENGTH} characters.`;
      continue;
    }
    merged[question.id] = answer;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, error: "Please fix the highlighted answers." };
  }

  const update: Record<string, unknown> = { details: merged };
  if (markComplete) update.details_completed_at = new Date().toISOString();

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", profileId);

  if (error) {
    return { error: "Could not save your answers. Please try again." };
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
    : saveLeaderDetails(profile.id, profile.details, formData, markComplete);
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
