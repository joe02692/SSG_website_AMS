-- ============================================================================
-- Leader registration — typed columns, from the DBMS team's
-- "Leaders Registration Form (SSG Secretary)" schema specification.
--
-- Replaces the five `test 1..5` placeholders that lived in profiles.details
-- (JSONB). 0010 did the same job for scouts, and the note at the top of
-- lib/onboarding.ts promised this table once the leader questions were
-- settled. This is that promise.
--
-- FOUR DELIBERATE DEPARTURES FROM THE PDF — each one is a decision, not an
-- oversight, and the DBMS team should push back if they disagree:
--
--  1. No `age` column. The PDF has `age INT NOT NULL` next to date_of_birth.
--     Storing both creates two facts that disagree the day after someone's
--     birthday. public.age_years(date_of_birth) already derives it, and the
--     scouts roster has used that since 0010. Same rule here.
--
--  2. No `full_name`. It is already public.profiles.full_name. Two copies
--     means one of them is wrong after the first name change.
--
--  3. No `email`. It is auth.users.email, which is also the login and is
--     verified. A second copy would be an unverified duplicate.
--
--  4. Committees reference public.stages rather than a new `committees`
--     lookup. The PDF models a separate table, but its contents would be the
--     same eight stages that already exist, and the group is *already*
--     carrying an unresolved conflict about that list (7 English names in the
--     handoff doc vs 8 Arabic in the scout PDF). A second copy of a list we
--     cannot yet agree on is how the two drift apart.
--
--     If the group later has committees that are NOT stages — media, finance,
--     logistics — that is the moment to add a real `committees` table and
--     repoint the junction. Nothing here blocks that.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Repair 0013 if it was never run.
--
-- Not this migration's job, strictly. But scout onboarding now writes
-- document_uploaded_at as part of creating the row, and on a database missing
-- that column PostgREST rejects the whole insert (PGRST204) — so a scout would
-- be unable to register at all. Idempotent: does nothing if 0013 ran.
-- ----------------------------------------------------------------------------
alter table public.scout_details
  add column if not exists document_uploaded_at timestamptz;

update public.scout_details
   set document_uploaded_at = now()
 where document_path is not null
   and document_uploaded_at is null;

-- ----------------------------------------------------------------------------
-- 1. Leader registration details. 1:1 with profiles, like scout_details.
-- ----------------------------------------------------------------------------
create table if not exists public.leader_details (
  profile_id        uuid primary key references public.profiles (id) on delete cascade,
  date_of_birth     date         not null,
  personal_phone    varchar(11)  not null,
  national_id       varchar(14)  not null unique,
  -- Backblaze object key for the ID card photo (صورة البطاقة الشخصية).
  -- NOT NULL per the PDF: a leader record without one is incomplete, and the
  -- onboarding form refuses to submit without it.
  id_card_path      text         not null,
  applicant_status  text         not null,
  university        varchar(100) not null,
  faculty           varchar(100) not null,
  -- NULLABLE in the PDF, and correctly so: a graduate has no academic year.
  academic_year     varchar(50),
  leadership_years  smallint     not null,
  join_date         date         not null,
  id_card_uploaded_at timestamptz,
  created_at        timestamptz  not null default now(),
  updated_at        timestamptz  not null default now(),

  -- VARCHAR only limits length; these check the contents.
  constraint leader_details_national_id_format
    check (national_id ~ '^[0-9]{14}$'),
  constraint leader_details_phone_format
    check (personal_phone ~ '^01[0-9]{9}$'),
  constraint leader_details_status_values
    check (applicant_status in ('university_student', 'graduate')),
  constraint leader_details_university_not_blank
    check (length(btrim(university)) > 0),
  constraint leader_details_faculty_not_blank
    check (length(btrim(faculty)) > 0),
  constraint leader_details_id_card_not_blank
    check (length(btrim(id_card_path)) > 0),
  -- Nobody has led for a negative number of years, and 70 is already generous
  -- for a group founded in 1968.
  constraint leader_details_experience_range
    check (leadership_years >= 0 and leadership_years <= 70),
  -- current_date is STABLE, not IMMUTABLE, so it cannot appear in a CHECK.
  -- The lower bounds live here; "not in the future" is a trigger below.
  constraint leader_details_dob_lower_bound
    check (date_of_birth > date '1900-01-01'),
  constraint leader_details_join_date_lower_bound
    check (join_date >= date '1968-01-01'),

  -- A graduate has no academic year; a student must give one. Enforcing the
  -- pair here means the two fields can never contradict each other, which a
  -- plain NULLABLE column cannot express.
  constraint leader_details_academic_year_matches_status
    check (
      (applicant_status = 'graduate' and academic_year is null)
      or
      (applicant_status = 'university_student'
        and academic_year is not null
        and length(btrim(academic_year)) > 0)
    )
);

comment on table public.leader_details is
  'Registration details for leaders and site staff. 1:1 with profiles. No age column — derive it with public.age_years(date_of_birth). No full_name or email — those live on profiles and auth.users.';

comment on column public.leader_details.id_card_path is
  'Backblaze object key for the ID card photo. Never a public URL — serve via a short-lived signed URL, minted on click.';

-- ----------------------------------------------------------------------------
-- 2. Which stages/committees a leader serves. The PDF's M:N relation.
-- ----------------------------------------------------------------------------
create table if not exists public.leader_committees (
  profile_id   uuid     not null references public.leader_details (profile_id) on delete cascade,
  stage_id     smallint not null references public.stages (id) on delete cascade,
  primary key (profile_id, stage_id)
);

comment on table public.leader_committees is
  'Many-to-many: a leader can serve more than one stage. See departure #4 in 0014 for why this points at stages rather than a separate committees table.';

create index if not exists leader_committees_stage_idx
  on public.leader_committees (stage_id);

-- ----------------------------------------------------------------------------
-- 3. A birth date, or a join date, cannot be in the future
-- ----------------------------------------------------------------------------
create or replace function public.check_leader_dates()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.date_of_birth > current_date then
    raise exception 'date_of_birth cannot be in the future';
  end if;
  if new.join_date > current_date then
    raise exception 'join_date cannot be in the future';
  end if;
  if new.join_date < new.date_of_birth then
    raise exception 'join_date cannot precede date_of_birth';
  end if;
  return new;
end;
$$;

drop trigger if exists leader_details_dates_sane on public.leader_details;
create trigger leader_details_dates_sane
  before insert or update on public.leader_details
  for each row execute function public.check_leader_dates();

drop trigger if exists leader_details_touch_updated_at on public.leader_details;
create trigger leader_details_touch_updated_at
  before update on public.leader_details
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Age, derived — the same view shape the scouts roster uses
-- ----------------------------------------------------------------------------
create or replace view public.leader_details_with_age
with (security_invoker = true) as
  select
    d.*,
    public.age_years(d.date_of_birth) as age_years,
    public.age_years(d.join_date)     as years_in_scouting
  from public.leader_details d;

comment on view public.leader_details_with_age is
  'leader_details plus derived age and years in scouting. security_invoker so the caller RLS applies — without it the view would read as its owner and bypass the policies below.';

-- ----------------------------------------------------------------------------
-- 5. Row level security
-- ----------------------------------------------------------------------------
alter table public.leader_details enable row level security;
alter table public.leader_committees enable row level security;

create policy "leader_details: read own"
  on public.leader_details for select
  to authenticated
  using ((select auth.uid()) = profile_id);

create policy "leader_details: insert own"
  on public.leader_details for insert
  to authenticated
  with check ((select auth.uid()) = profile_id);

create policy "leader_details: update own"
  on public.leader_details for update
  to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

create policy "leader_details: site admins read all"
  on public.leader_details for select
  to authenticated
  using (public.is_site_admin());

create policy "leader_committees: read own"
  on public.leader_committees for select
  to authenticated
  using ((select auth.uid()) = profile_id);

create policy "leader_committees: write own"
  on public.leader_committees for all
  to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

create policy "leader_committees: site admins read all"
  on public.leader_committees for select
  to authenticated
  using (public.is_site_admin());

-- No DELETE policy on leader_details: removing a leader is a guarded admin
-- flow through the service role, not something a session can do to itself.

-- ----------------------------------------------------------------------------
-- 6. Table privileges
--
-- RLS and GRANT are two separate gates and BOTH must open. A policy that says
-- "you may insert your own row" is irrelevant if the role has no INSERT
-- privilege on the table at all — Postgres refuses at the grant, before it
-- ever evaluates the policy, and reports 42501 either way. That makes the two
-- failures look identical while needing opposite fixes.
--
-- Omitting this block is exactly what broke leader onboarding on 6 Sep 2026:
-- the tables and every policy existed, and every leader still got
-- "permission denied for table leader_details". 0001 and 0010 both grant
-- explicitly; this one did not.
--
-- Privileges match the policies deliberately — no DELETE on leader_details,
-- because there is no DELETE policy to go with it.
-- ----------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update on public.leader_details to authenticated;
grant select, insert, update, delete on public.leader_committees to authenticated;
grant select on public.leader_details_with_age to authenticated;

notify pgrst, 'reload schema';
