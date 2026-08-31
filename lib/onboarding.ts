import { isStaffRole, type Role } from "@/lib/roles";

/**
 * The questions asked after signup.
 *
 * Two different storage strategies, on purpose:
 *
 *  • SCOUT questions map to real typed columns in public.scout_details, with
 *    database constraints behind them. Their `id` IS the column name.
 *  • LEADER questions are still placeholders and live in the profiles.details
 *    JSONB blob, where rewording costs nothing.
 *
 * When the leader questions are finalised, promote them the same way — a
 * `leader_details` table with real columns — rather than leaving them in JSONB.
 */

export type QuestionType =
  | "text"
  | "tel"
  | "textarea"
  | "select"
  | "date";

export type Question = {
  /** Storage key. For scouts this is the scout_details column name. */
  id: string;
  label: string;
  hint?: string;
  type?: QuestionType;
  /** Required when type is "select". The only accepted answers (values). */
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
};

/**
 * Mirrors the seed in migration 0010. Values are stage `code`s; the action
 * resolves a code to its numeric stage_id, so this list can be reordered
 * without touching stored data.
 */
export const SCOUT_STAGES = [
  { value: "baraem", label: "Buds — براعم" },
  { value: "zahrat", label: "Blossoms — زهرات" },
  { value: "ashbal", label: "Cubs — أشبال" },
  { value: "morshedat", label: "Guides — مرشدات" },
  { value: "kashafa", label: "Scouts — كشافة" },
  { value: "motaqademat", label: "Senior Guides — متقدمات" },
  { value: "motaqadem", label: "Senior Scouts — متقدم" },
  { value: "jawala", label: "Rovers — جوالة" },
];

/**
 * Scout registration. Each id is a column on public.scout_details.
 *
 * Note what's absent: age. It's derived from date_of_birth on every read
 * (public.age_years), so it's correct on the member's birthday with nothing
 * to run. Asking for it would create two facts that can disagree.
 */
export const SCOUT_QUESTIONS: Question[] = [
  {
    id: "date_of_birth",
    label: "Date of birth — تاريخ الميلاد",
    type: "date",
    required: true,
    hint: "We work out your age from this, so it stays correct every year.",
  },
  {
    id: "address",
    label: "Full address — العنوان بالكامل",
    type: "textarea",
    required: true,
  },
  {
    id: "personal_phone",
    label: "Personal phone — رقم الهاتف الخاص",
    type: "tel",
    required: true,
    placeholder: "01XXXXXXXXX",
    hint: "11 digits, starting 01.",
  },
  {
    id: "parent_phone",
    label: "Parent / guardian phone — رقم هاتف ولي الأمر",
    type: "tel",
    required: true,
    placeholder: "01XXXXXXXXX",
  },
  {
    id: "stage_code",
    label: "Scouting stage — اختر المرحلة",
    type: "select",
    required: true,
    options: SCOUT_STAGES,
  },
  {
    id: "national_id",
    label: "National ID — الرقم القومي",
    type: "text",
    required: false,
    placeholder: "14 digits",
    hint: "Optional, but needed before camps and official registration.",
  },
];

/** Asked of anyone who joins with an invite code. Still placeholders. */
export const LEADER_QUESTIONS: Question[] = [
  { id: "leader_q1", label: "Test 1", type: "text" },
  { id: "leader_q2", label: "Test 2", type: "text" },
  {
    id: "leader_q3",
    label: "Test 3",
    type: "select",
    options: [
      { value: "Option A", label: "Option A" },
      { value: "Option B", label: "Option B" },
      { value: "Option C", label: "Option C" },
    ],
  },
  { id: "leader_q4", label: "Test 4", type: "text" },
  { id: "leader_q5", label: "Test 5", type: "text" },
];

/** Staff get the leader set; everyone else gets scout registration. */
export function questionsForRole(role: Role | null | undefined): Question[] {
  return isStaffRole(role) ? LEADER_QUESTIONS : SCOUT_QUESTIONS;
}

/** True when this member's answers belong in scout_details, not JSONB. */
export function usesScoutDetails(role: Role | null | undefined): boolean {
  return !isStaffRole(role);
}

/** Longest free-text answer we'll store. */
export const MAX_ANSWER_LENGTH = 500;

/** Whole years since a birth date — the client-side twin of age_years(). */
export function ageFromDateOfBirth(dob: string): number | null {
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const monthDelta = today.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < born.getDate())) {
    age -= 1;
  }
  return age;
}
