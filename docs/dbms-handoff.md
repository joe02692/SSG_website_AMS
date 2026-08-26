# DBMS Team Hand-off — Schema Requirements from Backend

**From:** Backend team
**Date:** 26 Aug 2026
**Deliverable requested:** migration SQL files (`supabase/migrations/0002_*.sql` onward) following the conventions below.

This document describes what the backend needs from the database for the next phase of the
El-Salam AMS: member approval, sections/stages, parent–scout guardianship, and season plans.
How you model it is your call — the "Requirements" say *what* must be true, the "Suggestions"
are just a starting point you're free to improve on.

---

## 1. What already exists (do not redesign without talking to backend)

Migration `0001_profiles_and_roles.sql` created:

- `public.user_role` — enum: `scout | leader | parent`
- `public.profiles` — one row per auth user (`id` FK → `auth.users`): `full_name`, `role`, timestamps.
  **`profiles.role` is the authoritative role.** It is written only by the `handle_new_user()`
  SECURITY DEFINER trigger and protected from client updates by a `prevent_role_escalation()` trigger.
- `public.leader_invites` — single-use codes that grant the leader role at signup, validated inside
  the trigger. Used codes are kept as audit records.
- `public.current_user_role()` — SECURITY DEFINER helper so RLS policies can check the caller's role
  without infinite recursion on `profiles`. Use this in your policies.

### Conventions every new migration must follow

1. **RLS enabled on every table.** No INSERT/UPDATE/DELETE policy = denied by default; be explicit
   about what each role can do. Use `(select auth.uid())` (wrapped in select, for plan caching) and
   `public.current_user_role()`.
2. **Clients never write privileged columns.** Anything security-relevant (role, approval status,
   stage assignment) is written by SECURITY DEFINER functions/triggers or leader-gated policies —
   never trusted from the browser.
3. `set search_path = ''` on every function; schema-qualify all references.
4. `updated_at` maintained by the existing `public.touch_updated_at()` trigger function.
5. One numbered SQL file per change set, committed to `supabase/migrations/` in the repo.
   Idempotent guards (`if not exists`, `drop policy if exists`) appreciated — we re-run files.

---

## 2. Stages (sections)

The group is organized into **7 stages**:
Bara'em, Ashbal, Advanced Scout, Rovers, Guides, Flowers, Advanced.

**Open question for you to resolve with the group's leadership:** are "stage" and "section"
the same organizational unit? Backend assumes yes (one concept). If they're different, document
the relationship.

**Requirements**

- A `stages` reference table (not an enum — the list may grow/rename), stable `id`, display name,
  and a sort order for UI listing.
- Every **scout** belongs to exactly one stage (or none while pending assignment).
- Every **leader** is assigned to exactly one stage (drives what they manage — see season plans).
  Parents have no stage.
- Backend query patterns to support: "all members of stage X", "the stage of user Y",
  "member counts per stage".

**Suggestion:** `stages(id smallint pk, name text unique, sort smallint)`; seed the 7 rows;
`profiles.stage_id smallint null references stages(id)`. RLS: everyone authenticated can read
`stages`; `profiles.stage_id` updatable only by leaders (or a SECURITY DEFINER function), not
by the member themselves.

## 3. Membership approval state

Today anyone who signs up is immediately a full member. We need a moderation gate.

**Requirements**

- Each profile has a membership status: at minimum `pending`, `active`, `inactive` (rejected/left).
- New signups start `pending`. Only leaders can change status. The change must record **who**
  changed it and **when** (audit).
- RLS consequence: members with `pending`/`inactive` status should be able to read their own
  profile (to see "awaiting approval") but should be excludable from member-facing queries.
  Backend will enforce app-level gating too, but the data must make the distinction cheap.

**Suggestion:** `profiles.status` (enum or FK), `approved_by uuid null`, `approved_at timestamptz null`,
plus an `audit_log` table (see §6) rather than columns-per-event.

## 4. Guardianship (parent ↔ scout)

**Requirements**

- Many-to-many: a parent can have several scouts in the group; a scout can have several guardians.
- Link creation/removal is a **leader** action (parents must not be able to link themselves to
  arbitrary scouts).
- RLS: a parent can read the profiles of their linked scouts (name, stage, status). Scouts don't
  automatically read their guardians' data. Leaders read everything (existing policy).
- Optional but useful: a `relationship` label (father/mother/guardian).

**Suggestion:** `guardianships(parent_id uuid FK profiles, scout_id uuid FK profiles,
relationship text null, created_by uuid, created_at, primary key (parent_id, scout_id))`
with CHECK-enforcing triggers (or FK-to-filtered-view technique) ensuring `parent_id` has role
parent and `scout_id` has role scout.

## 5. Season plans

One plan per stage, editable only by the leaders of that stage. Full context and decisions:
`claude/feature-backlog.md` in the Claude project (ask backend if you can't see it).

**Requirements**

- `season_plans`: exactly one row per stage (`stage_id` unique), free-text details, a storage path
  for the official PDF, `updated_by` + `updated_at`.
- RLS: any authenticated member reads; UPDATE only when the caller is a leader **and**
  `profiles.stage_id` of the caller matches the row's `stage_id`.
- A **private** Supabase Storage bucket `season-plans` with matching storage policies
  (read: authenticated; write: leader of the matching stage — path convention
  `<stage_id>/plan.pdf` makes the policy writable).

## 6. Audit log (cheap now, painful later)

**Requirements**

- Append-only `audit_log(id, actor uuid, action text, subject uuid null, detail jsonb, created_at)`.
- Written from SECURITY DEFINER functions / triggers on privileged transitions: role change,
  status change, guardianship link/unlink, season plan update.
- RLS: leaders read; nobody updates or deletes (no policies for those).

---

## 7. What backend builds on top (so you can sanity-check access patterns)

- Approve/deactivate member actions (leader-gated) → status transitions + audit rows
- Stage assignment UI on `/members` → `profiles.stage_id` updates by leaders
- Guardianship linking UI → insert/delete on `guardianships` by leaders
- Season plan dashboard `/dashboard/season-plan` → read by stage, update text, upload PDF to storage
- Parents' view of their scouts → `guardianships` join read as the parent

Ping backend before finalizing anything that changes `profiles.role` handling or the signup
trigger — that path is security-critical and verified end-to-end.
