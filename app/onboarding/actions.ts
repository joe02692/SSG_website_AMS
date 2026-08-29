"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/dal";
import {
  MAX_ANSWER_LENGTH,
  ONBOARDING_QUESTIONS,
} from "@/lib/onboarding";

export type DetailsState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  notice?: string;
};

/**
 * Saves the onboarding answers.
 *
 * `markComplete` is what separates the two callers: the onboarding page stamps
 * details_completed_at (so the member stops being redirected there), while the
 * profile page just updates the values.
 */
async function saveDetails(
  formData: FormData,
  markComplete: boolean,
): Promise<DetailsState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You need to be signed in." };

  const values: Record<string, string | null> = {};
  const fieldErrors: Record<string, string> = {};

  for (const question of ONBOARDING_QUESTIONS) {
    const raw = formData.get(question.column);
    const answer = typeof raw === "string" ? raw.trim() : "";

    if (question.required && !answer) {
      fieldErrors[question.column] = "This one is required.";
      continue;
    }
    if (answer.length > MAX_ANSWER_LENGTH) {
      fieldErrors[question.column] =
        `Keep it under ${MAX_ANSWER_LENGTH} characters.`;
      continue;
    }
    // Empty stays NULL rather than "" — an unanswered question and a blank
    // answer are the same thing, and NULL is easier to query for later.
    values[question.column] = answer || null;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, error: "Please fix the highlighted answers." };
  }

  if (markComplete) {
    values.details_completed_at = new Date().toISOString();
  }

  const supabase = await createClient();
  // Only the detail columns are touched here. `role` isn't in this object,
  // and prevent_role_escalation() would reject it even if it were.
  const { error } = await supabase
    .from("profiles")
    .update(values)
    .eq("id", user.id);

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
