-- ============================================================================
-- Moves onboarding answers from five fixed columns to a single JSONB column.
--
-- Why: there are now two question sets (one for scouts, one for leaders), the
-- wording is still placeholder, and questions will be added and removed. Fixed
-- columns meant a migration for every one of those changes, and `detail_3`
-- would have meant different things depending on who answered it.
--
-- With JSONB the question definitions live entirely in lib/onboarding.ts —
-- adding, removing or rewording a question is a code change with no migration.
--
-- Trade-off, stated plainly: the database no longer knows the shape of this
-- data. Once the real questions settle and stop moving, the answers that
-- matter for reporting (phone number, stage, years in the group) should be
-- promoted to proper typed columns. That's a good task for the DBMS team.
-- ============================================================================

alter table public.profiles
  add column if not exists details jsonb not null default '{}'::jsonb;

comment on column public.profiles.details is
  'Onboarding answers, keyed by question id from lib/onboarding.ts (scout_q1…, leader_q1…). Question definitions live in code, not here.';

-- Carry across anything already answered under the old columns. Guarded so
-- the file is safe to re-run after the columns are dropped.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'profiles'
       and column_name = 'detail_1'
  ) then
    execute $migrate$
      update public.profiles
         set details = coalesce(details, '{}'::jsonb) || jsonb_strip_nulls(
               jsonb_build_object(
                 'scout_q1', detail_1,
                 'scout_q2', detail_2,
                 'scout_q3', detail_3,
                 'scout_q4', detail_4,
                 'scout_q5', detail_5
               )
             )
    $migrate$;
  end if;
end
$$;

alter table public.profiles
  drop column if exists detail_1,
  drop column if exists detail_2,
  drop column if exists detail_3,
  drop column if exists detail_4,
  drop column if exists detail_5;

-- details_completed_at is unchanged: still NULL until onboarding is finished.
--
-- No policy changes needed. "profiles: update own" already covers this column,
-- and prevent_role_escalation() still guards the one that matters (role).
