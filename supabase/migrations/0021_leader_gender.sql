-- 0021 — Leader gender. Requested 29 Sep 2026.
--
-- Leaders' ID card photos are filed in Backblaze by gender
-- (Leaders/Males/…, Leaders/Females/…), so the registration form now asks
-- for it.
--
-- NULLABLE on purpose: leaders who registered before today have no answer
-- yet. The form requires it, so each one fills it in the next time they save
-- their details — and their file moves to the right folder at that moment.
-- Until then their photo sits in "Leaders/Gender not set/".
--
-- Safe to run more than once.

alter table public.leader_details
  add column if not exists gender text;

alter table public.leader_details
  drop constraint if exists leader_details_gender_values;
alter table public.leader_details
  add constraint leader_details_gender_values
  check (gender is null or gender in ('male', 'female'));

comment on column public.leader_details.gender is
  'male | female. Decides the Backblaze folder for the ID card photo. NULL only for leaders registered before 0021.';

-- leader_details_with_age selects d.*, which Postgres expands when the view
-- is created — so a new column only appears in it after a rebuild.
drop view if exists public.leader_details_with_age;
create view public.leader_details_with_age
with (security_invoker = true) as
  select
    d.*,
    public.age_years(d.date_of_birth) as age_years,
    (extract(year from current_date)::int - d.join_year) as years_in_scouting
  from public.leader_details d;

grant select on public.leader_details_with_age to authenticated;
grant select on public.leader_details_with_age to service_role;

notify pgrst, 'reload schema';
