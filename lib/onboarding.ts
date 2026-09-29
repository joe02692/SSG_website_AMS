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
  | "date"
  | "number"
  /** One or more choices. Submitted as repeated form values under one name. */
  | "checkbox"
  /** Uploads to Backblaze on selection and submits the resulting object key. */
  | "file";

export type Question = {
  /** Storage key. For scouts this is the scout_details column name. */
  id: string;
  label: string;
  hint?: string;
  type?: QuestionType;
  /** Required when type is "select" or "checkbox". The only accepted answers. */
  options?: { value: string; label: string }[];
  /** number only. */
  min?: number;
  max?: number;
  /**
   * Show this question only when another question currently holds one of
   * these values. Used for academic year, which a graduate must not answer —
   * the database enforces the same pairing, this just stops people filling in
   * a box that will be rejected.
   */
  visibleWhen?: { question: string; equals: string[] };
  required?: boolean;
  placeholder?: string;
};

/**
 * Mirrors the seed in migration 0010. Values are stage `code`s; the action
 * resolves a code to its numeric stage_id, so this list can be reordered
 * without touching stored data.
 */
export const SCOUT_STAGES = [
  { value: "baraem", label: "Buds" },
  { value: "zahrat", label: "Blossoms" },
  { value: "ashbal", label: "Cubs" },
  { value: "morshedat", label: "Guides" },
  { value: "kashafa", label: "Scouts" },
  { value: "motaqademat", label: "Senior Guides" },
  { value: "motaqadem", label: "Senior Scouts" },
  { value: "jawala", label: "Rovers" },
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
    label: "Date of birth",
    type: "date",
    required: true,
    hint: "We work out your age from this, so it stays correct every year.",
  },
  {
    id: "address",
    label: "Full address",
    type: "textarea",
    required: true,
  },
  {
    id: "personal_phone",
    label: "Personal phone",
    type: "tel",
    required: true,
    placeholder: "01XXXXXXXXX",
    hint: "11 digits, starting 01.",
  },
  {
    id: "parent_phone",
    label: "Parent / guardian phone",
    type: "tel",
    required: true,
    placeholder: "01XXXXXXXXX",
  },
  {
    id: "stage_code",
    label: "Scouting stage",
    type: "select",
    required: true,
    options: SCOUT_STAGES,
  },
  {
    id: "national_id",
    label: "National ID",
    type: "text",
    required: false,
    placeholder: "14 digits",
    hint: "Optional, but needed before camps and official registration.",
  },
  {
    id: "document_path",
    label: "Birth certificate image",
    type: "file",
    required: true,
    hint: "A photo or scan is fine — uploading straight from your phone works. Only you and the site admins can see it.",
  },
];

/**
 * Applicant status — the PDF's ENUM('University Student', 'Graduate').
 * Stored as the snake_case value; the CHECK constraint in 0014 accepts exactly
 * these two.
 */
export const APPLICANT_STATUSES = [
  { value: "university_student", label: "University student" },
  { value: "graduate", label: "Graduate" },
];

/**
 * The group's work committees — separate from stages, and a leader can sit on
 * several. Stored as codes in leader_details.committees; migration 0020's
 * CHECK accepts exactly these values, so adding one means adding it there too.
 */
export const LEADER_COMMITTEES = [
  { value: "program", label: "Program committee" },
  { value: "media", label: "Media committee" },
  { value: "secretary", label: "Secretary committee" },
  { value: "logistics", label: "Tools & logistics committee" },
  { value: "training", label: "Training committee" },
];

/** Leader gender — migration 0021 accepts exactly these two values. */
export const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

/** Years offered for "Year you joined scouting", newest first. */
const THIS_YEAR = new Date().getFullYear();
export const JOIN_YEARS = Array.from({ length: THIS_YEAR - 1950 + 1 }, (_, i) => {
  const year = String(THIS_YEAR - i);
  return { value: year, label: year };
});

/**
 * Leader registration. Each id is a column on public.leader_details, except
 * `committee_codes`, which becomes rows in public.leader_committees (the
 * stages a leader serves).
 *
 * Taken from the DBMS team's "Leaders Registration Form (SSG Secretary)"
 * specification. Three fields in that document are deliberately absent here:
 * full_name (already on profiles), email (already on auth.users, and
 * verified), and age (derived from date_of_birth by public.age_years, so it
 * cannot drift out of date). See the header of migration 0014.
 */
export const LEADER_QUESTIONS: Question[] = [
  {
    id: "date_of_birth",
    label: "Date of birth",
    type: "date",
    required: true,
    hint: "Your age is worked out from this, so it stays correct every year.",
  },
  {
    id: "gender",
    label: "Gender",
    type: "select",
    required: true,
    options: GENDERS,
    hint: "Leaders' documents are filed by gender.",
  },
  {
    id: "personal_phone",
    label: "Personal phone",
    type: "tel",
    required: true,
    placeholder: "01XXXXXXXXX",
    hint: "11 digits, starting 01.",
  },
  {
    id: "national_id",
    label: "National ID",
    type: "text",
    required: true,
    placeholder: "14 digits",
    hint: "14 digits. Each leader's number must be unique.",
  },
  {
    id: "id_card_path",
    label: "ID card photo",
    type: "file",
    required: true,
    hint: "A photo or scan of both sides if possible. Only you and the site admins can see it.",
  },
  {
    id: "applicant_status",
    label: "Current status",
    type: "select",
    required: true,
    options: APPLICANT_STATUSES,
  },
  {
    id: "university",
    label: "University",
    type: "text",
    required: true,
  },
  {
    id: "faculty",
    label: "Faculty / College",
    type: "text",
    required: true,
  },
  {
    id: "academic_year",
    label: "Academic year",
    type: "text",
    required: true,
    placeholder: "e.g. Third year",
    hint: "Students only — graduates skip this.",
    // Mirrors the CHECK constraint in 0014: a graduate must leave this empty,
    // a student must fill it in. Hiding it is kinder than rejecting it.
    visibleWhen: { question: "applicant_status", equals: ["university_student"] },
  },
  {
    id: "committee_codes",
    label: "Stages you serve",
    type: "checkbox",
    required: true,
    hint: "Tick every stage you lead. Most leaders serve more than one.",
    options: SCOUT_STAGES,
  },
  {
    id: "committees",
    label: "Committees",
    type: "checkbox",
    required: false,
    hint: "Tick every committee you're part of, if any.",
    options: LEADER_COMMITTEES,
  },
  {
    id: "leadership_years",
    label: "Years of leadership experience",
    type: "number",
    required: true,
    min: 0,
    max: 70,
  },
  {
    id: "join_year",
    label: "Year you joined scouting",
    type: "select",
    required: true,
    placeholder: "Choose a year…",
    options: JOIN_YEARS,
  },
];

/** Staff get the leader set; everyone else gets scout registration. */
export function questionsForRole(role: Role | null | undefined): Question[] {
  return isStaffRole(role) ? LEADER_QUESTIONS : SCOUT_QUESTIONS;
}

/** True when this member's answers belong in scout_details. */
export function usesScoutDetails(role: Role | null | undefined): boolean {
  return !isStaffRole(role);
}

/** True when this member's answers belong in leader_details. */
export function usesLeaderDetails(role: Role | null | undefined): boolean {
  return isStaffRole(role);
}

/** The document each role uploads during onboarding, by question id. */
export function documentQuestionId(role: Role | null | undefined): string {
  return isStaffRole(role) ? "id_card_path" : "document_path";
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
