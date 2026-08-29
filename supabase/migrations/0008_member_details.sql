-- ============================================================================
-- Onboarding details collected after signup.
--
-- The columns are named generically (detail_1 … detail_5) on purpose: the
-- questions are placeholders for now, and the *labels* live in
-- lib/onboarding.ts. Swapping "Test 1" for "Phone number" is a one-line code
-- change with no migration.
--
-- When the real questions settle, hand this to the DBMS team to rename the
-- columns properly (detail_1 → phone, etc.) — generic column names are fine
-- as scaffolding, not as a permanent schema.
-- ============================================================================

alter table public.profiles
  add column if not exists detail_1 text,
  add column if not exists detail_2 text,
  add column if not exists detail_3 text,
  add column if not exists detail_4 text,
  add column if not exists detail_5 text,
  add column if not exists details_completed_at timestamptz;

comment on column public.profiles.details_completed_at is
  'Set when the member finishes the onboarding questions. NULL means they still owe answers and get redirected to /onboarding.';

-- Accounts that predate this migration are treated as done, so existing
-- members aren't ambushed by a form on their next visit. New signups start
-- NULL and go through onboarding.
update public.profiles
   set details_completed_at = now()
 where details_completed_at is null;

-- No new policies needed: the existing "profiles: update own" policy already
-- lets a member write their own row, and prevent_role_escalation() still
-- blocks the only column that matters (role).
