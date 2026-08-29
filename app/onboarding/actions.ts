"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dal";
import { MAX_ANSWER_LENGTH, questionsForRole } from "@/lib/onboarding";

export type DetailsState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  notice?: string;
};

/**
 * Saves onboarding answers into the profiles.details JSONB column.
 *
 * `markComplete` is what separates the two callers: the onboarding page stamps
 * details_completed_at (so the member stops being redirected there), while the
 * profile page only updates values.
 */
async function saveDetails(
  formData: FormData,
  markComplete: boolean,
): Promise<DetailsState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "You need to be signed in." };

  // The question set is chosen from the member's stored role, never from the
  // submitted form — otherwise anyone could post answers to another set.
  const questions = questionsForRole(profile.role);

  const answers: Record<string, string> = {};
  const fieldErrors: Record<string, string> = {};

  for (const question of questions) {
    const raw = formData.get(question.id);
    const answer = typeof raw === "string" ? raw.trim() : "";

    if (!answer) {
      if (question.required) {
        fieldErrors[question.id] = "This one is required.";
      }
      // Unanswered: leave the key out entirely rather than storing "".
      continue;
    }

    if (question.type === "select") {
      // A <select> is only a suggestion to the browser; the submitted value
      // still has to be checked against the allowed options.
      if (!question.options?.includes(answer)) {
        fieldErrors[question.id] = "Choose one of the listed options.";
        continue;
      }
    } else if (answer.length > MAX_ANSWER_LENGTH) {
      fieldErrors[question.id] =
        `Keep it under ${MAX_ANSWER_LENGTH} characters.`;
      continue;
    }

    answers[question.id] = answer;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, error: "Please fix the highlighted answers." };
  }

  // Merge rather than replace: a member who answers the leader set later
  // shouldn't wipe answers stored under other keys.
  const merged: Record<string, string> = { ...profile.details };
  for (const question of questions) {
    if (answers[question.id]) merged[question.id] = answers[question.id];
    else delete merged[question.id];
  }

  const update: Record<string, unknown> = { details: merged };
  if (markComplete) {
    update.details_completed_at = new Date().toISOString();
  }

  const supabase = await createClient();
  // Only these columns are touched. `role` isn't in the object, and
  // prevent_role_escalation() would reject it even if it were.
  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", profile.id);

  if (error) {
    return { error: "Could not save your answers. Please try again." };
  }

  revalidatePath("/", "layout");
  return { notice: "Your details have been saved." };
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
