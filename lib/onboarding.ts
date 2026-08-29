/**
 * The questions asked after signup.
 *
 * ⚠️ PLACEHOLDERS. Replace `label` (and `hint`/`type`/`required`) with the real
 * questions when they're decided — phone number, address, years in the group,
 * and so on. Nothing else needs to change: the database columns are generic
 * (`detail_1` … `detail_5`) and the form renders straight from this array.
 *
 * To add or remove a question you *do* need a migration, since each one maps
 * to a column. Five is what exists today.
 */

export type OnboardingQuestion = {
  /** Column on public.profiles. Do not change without a migration. */
  column: "detail_1" | "detail_2" | "detail_3" | "detail_4" | "detail_5";
  /** The question as the member sees it. Safe to reword freely. */
  label: string;
  /** Optional helper text under the label. */
  hint?: string;
  /** Input type — "tel" for phone numbers, "textarea" for addresses, etc. */
  type?: "text" | "tel" | "textarea";
  /** Whether an answer is needed to finish onboarding. */
  required?: boolean;
  placeholder?: string;
};

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  { column: "detail_1", label: "Test 1", type: "text" },
  { column: "detail_2", label: "Test 2", type: "text" },
  { column: "detail_3", label: "Test 3", type: "text" },
  { column: "detail_4", label: "Test 4", type: "text" },
  { column: "detail_5", label: "Test 5", type: "text" },
];

/** Longest answer we'll store, per question. */
export const MAX_ANSWER_LENGTH = 500;
