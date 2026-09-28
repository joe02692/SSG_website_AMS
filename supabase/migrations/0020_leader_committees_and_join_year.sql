-- ============================================================================
-- 0020 — Leader details: work committees, and "year you joined" instead of
-- a full date. Requested 29 Sep 2026.
--
-- 1. COMMITTEES. Leaders already tick the STAGES they serve (stored in
--    public.leader_committees, which despite its name points at stages — see
--    departure #4 in 0014). The group also runs committees that are not
--    stages, and a leader can sit on several:
--
--        program · media · secretary · logistics ("Tools & logistics") · training
--
--    0014 said "the moment the group has committees that are NOT stages is
--    the moment to add them". They're a short, fixed list, so they are a
--    text[] on leader_details with a CHECK that only these codes are allowed:
--    one column, no extra join, and the database still refuses anything else.
--    Adding a committee later = add its code to the CHECK below and to
--    LEADER_COMMITTEES in lib/onboarding.ts. Optional: an empty list is fine.
--
-- 2. JOIN YEAR. Most leaders don't remember the day they joined scouting,
--    only the year. join_date (date) becomes join_year (smallint). Existing
--    rows keep their year; the day and month are dropped.
--    leader_details_with_age depends on join_date, so it is dropped and
--    recreated, and the date-sanity trigger is rewritten for a year.
--
-- Run it BEFORE deploying the code that goes with it (that code writes
-- join_year and committees). Safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------- committees
alter table public.leader_details
  add column if not exists committees text[] not null default '{}';

alter table public.leader_details
  drop constraint if exists leader_details_committees_values;
alter table public.leader_details
  add constraint leader_details_committees_values
  check (committees <@ array['program', 'media', 'secretary', 'logistics', 'training']::text[]);

comment on column public.leader_details.committees is
  'Work committees the leader sits on (not stages — those are in leader_committees). Allowed codes: program, media, secretary, logistics, training.';

-- ----------------------------------------------------------------- join year
alter table public.leader_details
  add column if not exists join_year smallint;

-- Keep what we know from the old column, if it is still there.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'leader_details'
       and column_name = 'join_date'
  ) then
    execute 'update public.leader_details
                set join_year = extract(year from join_date)::smallint
              where join_year is null';
  end if;
end;
$$;

-- The view reads d.*, so it has to go before the column can.
drop view if exists public.leader_details_with_age;

alter table public.leader_details drop column if exists join_date;
alter table public.leader_details drop constraint if exists leader_details_join_date_lower_bound;

alter table public.leader_details alter column join_year set not null;

alter table public.leader_details
  drop constraint if exists leader_details_join_year_range;
alter table public.leader_details
  add constraint leader_details_join_year_range
  check (join_year >= 1900 and join_year <= 2100);

-- "Not in the future" and "not before you were born" need today's date and
-- the other column, so they stay in the trigger rather than a CHECK.
create or replace function public.check_leader_dates()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.date_of_birth > current_date then
    raise exception 'date_of_birth cannot be in the future';
  end if;
  if new.join_year > extract(year from current_date) then
    raise exception 'join_year cannot be in the future';
  end if;
  if new.join_year < extract(year from new.date_of_birth) then
    raise exception 'join_year cannot precede the year of birth';
  end if;
  return new;
end;
$$;

-- Same shape as before, with years in scouting counted from the year.
create view public.leader_details_with_age
with (security_invoker = true) as
  select
    d.*,
    public.age_years(d.date_of_birth) as age_years,
    (extract(year from current_date)::int - d.join_year) as years_in_scouting
  from public.leader_details d;

comment on view public.leader_details_with_age is
  'leader_details plus derived age and years in scouting. security_invoker so the caller RLS applies.';

-- Recreating a view drops its grants. Explicit, per this repo's rule.
grant select on public.leader_details_with_age to authenticated;
grant select on public.leader_details_with_age to service_role;

notify pgrst, 'reload schema';
