# DBMS Team — Schema Requirements

**From:** Backend team
**Date:** 27 Aug 2026
**Ask:** migration SQL files (`supabase/migrations/0002_*.sql` onward, one per change set) added to the repo, following the conventions in §2 below.

This is everything the backend needs from the database for the next phase of the El-Salam AMS.
It's organized by priority so you know what to design first. For each piece, "Requirements" is
what must be true — "Suggestion" is one way to build it; improve on it freely as long as the
requirement holds. If anything here doesn't match what the group's leadership actually wants
organizationally (see the open question in §3), stop and ask rather than guessing.

---

## Priority 1 — needed now (blocks member management)

### 1. What already exists — read this before designing anything

Migration `0001_profiles_and_roles.sql` already created:

- `public.user_role` — enum: `scout | leader | parent`
- `public.profiles` — one row per auth user (`id` FK → `auth.users`): `full_name`, `role`, timestamps.
  **`profiles.role` is the single authoritative role.** It's written only by the `handle_new_user()`
  SECURITY DEFINER trigger on signup, and a `prevent_role_escalation()` trigger blocks any client
  update to it. Don't design around reading role from anywhere else (not JWT metadata).
- `public.leader_invites` — single-use signup codes that grant the leader role, validated inside the
  trigger. Used codes are kept as permanent audit records, not deleted.
- `public.current_user_role()` — a SECURITY DEFINER helper so RLS policies can check the caller's
  role without infinite recursion on `profiles`. Reuse this in new policies rather than re-querying
  `profiles` directly from inside a `profiles` policy.

**Conventions every new migration must follow:**

1. **RLS enabled on every table, no exceptions.** No policy for an operation = denied by default.
   Be explicit about what each role can do.
2. **Clients never write privileged columns.** Role, approval status, stage assignment — anything
   security-relevant is written by a SECURITY DEFINER function/trigger or a leader-gated policy,
   never trusted from the browser.
3. Every function: `set search_path = ''`, and schema-qualify all table references inside it.
4. Use the existing `public.touch_updated_at()` trigger to maintain `updated_at` — don't write a new one.
5. One numbered file per change set in `supabase/migrations/`, committed to the repo. Idempotent
   guards (`if not exists`, `drop policy if exists`) appreciated since we sometimes re-run files.

### 2. Stages (sections)

The group has **7 stages**: Bara'em, Ashbal, Advanced Scout, Rovers, Guides, Flowers, Advanced.

**Requirements**

- A `stages` reference table — not an enum, since the list may be renamed or reordered later.
  Stable `id`, display name, sort order for UI listing.
- Every **scout** belongs to exactly one stage, or none while awaiting assignment.
- Every **leader** is assigned to exactly one stage — this is what scopes what they can manage.
  Parents have no stage.
- Query patterns the backend needs to support cheaply: all members of stage X, the stage of a
  given user, member counts per stage.

**Suggestion:** `stages(id smallint pk, name text unique, sort smallint)`, seeded with the 7 rows.
`profiles.stage_id smallint null references stages(id)`. RLS: any authenticated user can read
`stages`; `profiles.stage_id` is updatable only by leaders, never by the member themselves.

### 3. Membership approval state

Right now anyone who signs up is immediately a full member with no review step. We need a
moderation gate before someone counts as an active member.

**Requirements**

- A membership status per profile: at minimum `pending`, `active`, `inactive` (left or rejected).
- New signups start at `pending`. Only a leader can change status, and the change must record
  **who** changed it and **when** — this is not optional, it's a safeguarding record for a group
  with minors.
- `pending`/`inactive` members can still read their own profile (to see "awaiting approval") but
  should be cheaply excludable from member-facing listings and counts.

**Suggestion:** `profiles.status` (enum or FK), `approved_by uuid null`, `approved_at timestamptz null`.
Log the transition itself in the audit log (§4) rather than only in these two columns.

### 4. Audit log

Cheap to add now, expensive to retrofit later — and this project handles minors' data, so a
change-of-role or change-of-status record is not optional polish.

**Requirements**

- Append-only `audit_log(id, actor uuid, action text, subject uuid null, detail jsonb, created_at)`.
- Written automatically from SECURITY DEFINER functions/triggers whenever something privileged
  changes: role change, status change, guardianship link/unlink (§5).
- RLS: leaders can read it; nobody gets an UPDATE or DELETE policy — that's what "append-only" means
  here, enforced by omission.

---

## Priority 2 — needed soon

### 5. Guardianship (parent ↔ scout)

**Requirements**

- Many-to-many: one parent can have several scouts in the group, one scout can have several
  guardians.
- Creating or removing a link is a **leader** action — parents must not be able to link themselves
  to an arbitrary scout's record.
- RLS: a parent can read the profiles of their linked scouts (name, stage, status) but not the
  reverse — a scout doesn't automatically see their guardians' data. Leaders read everything, as now.
- A `relationship` label (father / mother / guardian) is useful but optional.

**Suggestion:** `guardianships(parent_id uuid FK profiles, scout_id uuid FK profiles,
relationship text null, created_by uuid, created_at, primary key (parent_id, scout_id))`, with a
check (trigger or constraint) that `parent_id` actually has role `parent` and `scout_id` role `scout`.

**Open question for the group's leadership, not just us:** is "stage" (§2) the same organizational
concept as "section"? We've assumed yes and designed §2 as one concept. If your team's research
says otherwise, flag it before building — it'll touch guardianships and reporting too.

---

## Priority 3 — later, not urgent (design only when you get to it)

### 6. Season plans

Requested as a future leader feature: each stage has one editable "season plan" (text + an
attached PDF) that only leaders of that stage can update. **Not being built yet** — no rush on
this section, but worth designing alongside stages (§2) since it depends on them directly.

**Requirements, whenever it's picked up**

- `season_plans`: exactly one row per stage (`stage_id` unique), free-text details, a storage path
  for the PDF, `updated_by` + `updated_at`.
- RLS: any authenticated member can read; UPDATE only when the caller is a leader **and**
  `profiles.stage_id` matches the row's `stage_id`.
- The PDF itself goes in a **private Supabase Storage bucket** (`season-plans`), not in a table
  column — with storage policies mirroring the table's (read: authenticated, write: the matching
  stage's leader). Path convention like `<stage_id>/plan.pdf` makes that policy simple to write.

---

## What backend is building on top of this (so you can sanity-check access patterns)

- Approve/deactivate member actions (leader-gated) → status transitions + audit rows
- Stage assignment on `/members` → `profiles.stage_id` updates by leaders
- Guardianship linking UI → insert/delete on `guardianships` by leaders
- Parents' view of their own scouts → a `guardianships` join, read as the parent
- (Later) Season plan dashboard → read scoped by stage, update text, upload PDF to storage

**Please ping backend before finalizing anything that touches `profiles.role` or the signup
trigger** — that path is security-critical and has already been verified end-to-end; changing it
without coordinating risks reopening the privilege-escalation hole it was built to close.

## What we need back

Migration files for Priority 1 (§1–4) is the immediate ask — that unblocks member approval and
stage assignment, which is the next thing backend builds. Priority 2 (§5) can follow once that's
in. Priority 3 (§6) has no deadline. Drop the files in `supabase/migrations/` in the repo and let
backend know — happy to review before you run them against production data.
