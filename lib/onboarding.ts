import { isStaffRole, type Role } from "@/lib/roles";

/**
 * The questions asked after signup.
 *
 * ⚠️ PLACEHOLDERS. Reword these freely — answers are stored in the JSONB
 * column `profiles.details`, keyed by `id`, so changing a `label`, a `type`,
 * the dropdown `options`, or adding and removing whole questions needs NO
 * database migration.
 *
 * The one thing to treat carefully is `id`: it is the storage key. Renaming an
 * id orphans every answer already saved under the old one. Add a new question
 * instead, or write a one-off SQL update to move the key.
 */

export type QuestionType = "text" | "tel" | "textarea" | "select";

export type Question = {
  /** Storage key inside profiles.details. Changing it orphans saved answers. */
  id: string;
  /** The question as the member sees it. Safe to reword. */
  label: string;
  hint?: string;
  type?: QuestionType;
  /** Required when type is "select". The only accepted answers. */
  options?: string[];
  required?: boolean;
  placeholder?: string;
};

/** Asked of scouts (and parents, once that opens). */
export const SCOUT_QUESTIONS: Question[] = [
  { id: "scout_q1", label: "Test 1", type: "text" },
  { id: "scout_q2", label: "Test 2", type: "text" },
  {
    id: "scout_q3",
    label: "Test 3",
    type: "select",
    options: ["Option A", "Option B", "Option C"],
  },
  { id: "scout_q4", label: "Test 4", type: "text" },
  { id: "scout_q5", label: "Test 5", type: "text" },
];

/** Asked of anyone who joins with an invite code. */
export const LEADER_QUESTIONS: Question[] = [
  { id: "leader_q1", label: "Test 1", type: "text" },
  { id: "leader_q2", label: "Test 2", type: "text" },
  {
    id: "leader_q3",
    label: "Test 3",
    type: "select",
    options: ["Option A", "Option B", "Option C"],
  },
  { id: "leader_q4", label: "Test 4", type: "text" },
  { id: "leader_q5", label: "Test 5", type: "text" },
];

/**
 * Which set a member sees. Staff roles (site admin, stage admin, stage leader)
 * get the leader questions; everyone else gets the scout ones.
 */
export function questionsForRole(role: Role | null | undefined): Question[] {
  return isStaffRole(role) ? LEADER_QUESTIONS : SCOUT_QUESTIONS;
}

/** Longest answer we'll store, per question. */
export const MAX_ANSWER_LENGTH = 500;
