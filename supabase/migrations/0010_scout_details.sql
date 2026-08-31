-- ============================================================================
-- Scout registration details — the real schema behind the onboarding form.
--
-- Based on the DBMS team's "Database Schema Specification" (scout_db_schema.pdf),
-- adapted to this project. Four deliberate departures from that document, all
-- for good reasons:
--
--  1. NO standalone `scout_members` table with its own AUTO_INCREMENT id.
--     That spec was written in MySQL (Postgres has no AUTO_INCREMENT) and, more
--     importantly, a free-standing table has no link to the person's login.
--     Every scout here already has a row in public.profiles keyed to
--     auth.users. This table hangs off that, 1:1, so an account and its
--     registration details can never drift apart or be orphaned.
--
--  2. `scout_stage` is a FK to a `stages` table, not an ENUM. Enum values
--     cannot be renamed or removed in Postgres without pain, and this list is
--     still being reconciled (see the warning below). A lookup table also lets
--     the app render Arabic and English names without hardcoding them.
--
--  3. NO `age` column. Age is derived from date_of_birth on read — see
--     public.age_years(). A stored age is wrong the day after it's written;
--     "updated automatically every birthday" is only truly achieved by not
--     storing it at all.
--
--  4. Phone/national-id lengths are enforced with CHECK constraints on
--     digits, not just VARCHAR(n). VARCHAR(11) accepts 'hello world'.
--
-- ⚠️ STAGE LIST CONFLICT — needs a decision from the group.
--    Tasks/dbms-handoff.md lists 7 stages in English (Bara'em, Ashbal,
--    Advanced Scout, Rovers, Guides, Flowers, Advanced). This PDF lists 8,
--    splitting the senior rank by gender (Motaqadem / Motaqademat) and adding
--    Kashafa. They are the same concept described twice. This migration seeds
--    the PDF's 8 as authoritative. If that's wrong, fix it HERE before anyone
--    registers — one list must serve both scouts and leaders.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Stages
-- ----------------------------------------------------------------------------
create table if not exists public.stages (
  id       smallint primary key,
  code     text     not null unique,
  name_en  text     not null,
  name_ar  text     not null,
  sort     smallint not null
);

comment on table public.stages is
  'The scouting stages. Referenced by scout_details.stage_id and (later) by leaders'' stage assignment. One list for the whole system.';

insert into public.stages (id, code, name_en, name_ar, sort) values
  (1, 'baraem',      'Buds',          'براعم',   1),
  (2, 'zahrat',      'Blossoms',      'زهرات',   2),
  (3, 'ashbal',      'Cubs',          'أشبال',   3),
  (4, 'morshedat',   'Guides',        'مرشدات',  4),
  (5, 'kashafa',     'Scouts',        'كشافة',   5),
  (6, 'motaqademat', 'Senior Guides', 'متقدمات', 6),
  (7, 'motaqadem',   'Senior Scouts', 'متقدم',   7),
  (8, 'jawala',      'Rovers',        'جوالة',   8)
on conflict (id) do update
  set code = excluded.code,
      name_en = excluded.name_en,
      name_ar = excluded.name_ar,
      sort = excluded.sort;

alter table public.stages enable row level security;

drop policy if exists "stages: readable by all authenticated" on public.stages;
create policy "stages: readable by all authenticated"
  on public.stages for select
  to authenticated
  using (true);

-- No write policies: the stage list is changed by migration, not by clients.

-- ----------------------------------------------------------------------------
-- 2. Scout registration details
--
--    One row per scout. NOT NULL means what it says here precisely *because*
--    this is a separate table — staff accounts simply have no row, rather than
--    a profiles row full of nulls.
-- ----------------------------------------------------------------------------
create table if not exists public.scout_details (
  profile_id      uuid primary key references public.profiles (id) on delete cascade,
  date_of_birth   date        not null,
  address         text        not null,
  national_id     varchar(14) unique,
  personal_phone  varchar(11) not null,
  parent_phone    varchar(11) not null,
  document_path   text,
  stage_id        smallint    not null references public.stages (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- VARCHAR(14) only limits length; these check the contents are digits.
  constraint scout_details_national_id_format
    check (national_id is null or national_id ~ '^[0-9]{14}$'),
  -- Egyptian mobile numbers: 11 digits starting 01.
  constraint scout_details_personal_phone_format
    check (personal_phone ~ '^01[0-9]{9}$'),
  constraint scout_details_parent_phone_format
    check (parent_phone ~ '^01[0-9]{9}$'),
  constraint scout_details_address_not_blank
    check (length(btrim(address)) > 0),
  -- current_date is STABLE, not IMMUTABLE, so it cannot appear in a CHECK.
  -- The lower bound goes here; the "not in the future" rule is a trigger below.
  constraint scout_details_dob_lower_bound
    check (date_of_birth > date '1900-01-01')
);

comment on table public.scout_details is
  'Registration details for scouts. 1:1 with profiles. No age column — derive it with public.age_years(date_of_birth).';

comment on column public.scout_details.national_id is
  'Egyptian national ID, 14 digits. UNIQUE but nullable: Postgres allows many NULLs in a unique index, so members without one do not collide.';

comment on column public.scout_details.document_path is
  'Path in the private "scout-documents" storage bucket. Never a public URL — serve via a signed URL.';

create index if not exists scout_details_stage_idx on public.scout_details (stage_id);

-- ----------------------------------------------------------------------------
-- 3. A birth date cannot be in the future
-- ----------------------------------------------------------------------------
create or replace function public.check_dob_not_future()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.date_of_birth > current_date then
    raise exception 'date_of_birth cannot be in the future'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists scout_details_dob_not_future on public.scout_details;
create trigger scout_details_dob_not_future
  before insert or update on public.scout_details
  for each row execute function public.check_dob_not_future();

drop trigger if exists scout_details_touch_updated_at on public.scout_details;
create trigger scout_details_touch_updated_at
  before update on public.scout_details
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Age, derived
--
--    This is the answer to "the age must update automatically every birthday":
--    it is never stored, so it is never stale. Calling age_years() today and
--    tomorrow gives different answers on the birthday, with nothing to run.
--
--    Note it cannot be a GENERATED column — those require IMMUTABLE
--    expressions, and anything involving "today" is by definition not.
-- ----------------------------------------------------------------------------
create or replace function public.age_years(dob date)
returns integer
language sql
stable
set search_path = ''
as $$
  select extract(year from age(current_date, dob))::int;
$$;

comment on function public.age_years(date) is
  'Whole years between a birth date and today. Use instead of storing age.';

-- Convenience view. security_invoker means the caller''s RLS on
-- scout_details still applies — without it the view would leak every row.
create or replace view public.scout_details_with_age
  with (security_invoker = true)
as
  select
    d.*,
    public.age_years(d.date_of_birth) as age
  from public.scout_details d;

-- ----------------------------------------------------------------------------
-- 5. Row Level Security
--
--    This table holds minors' home addresses, national ID numbers and parents'
--    phone numbers. Access is deliberately tight.
-- ----------------------------------------------------------------------------
alter table public.scout_details enable row level security;

drop policy if exists "scout_details: read own" on public.scout_details;
create policy "scout_details: read own"
  on public.scout_details for select
  to authenticated
  using ((select auth.uid()) = profile_id);

drop policy if exists "scout_details: insert own" on public.scout_details;
create policy "scout_details: insert own"
  on public.scout_details for insert
  to authenticated
  with check ((select auth.uid()) = profile_id);

drop policy if exists "scout_details: update own" on public.scout_details;
create policy "scout_details: update own"
  on public.scout_details for update
  to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

drop policy if exists "scout_details: site admins read all" on public.scout_details;
create policy "scout_details: site admins read all"
  on public.scout_details for select
  to authenticated
  using (public.is_site_admin());

-- No DELETE policy: rows disappear with the account, via the cascade.
-- Stage leaders get no access yet — once leaders are assigned to a stage,
-- add a policy scoped to their own stage rather than widening this one.

grant usage on schema public to authenticated;
grant select on public.stages to authenticated;
grant select, insert, update on public.scout_details to authenticated;
grant select on public.scout_details_with_age to authenticated;

-- ----------------------------------------------------------------------------
-- 6. Still to do (not in this migration)
--
--  * A private Storage bucket "scout-documents" for document_path, with
--    policies mirroring the table's. Birth certificates and ID scans of
--    minors must never sit in a public bucket — serve them with short-lived
--    signed URLs, and only to the member and site admins.
--  * Decide the stage-list conflict flagged at the top of this file.
--  * Leaders' own stage assignment (profiles.stage_id → public.stages).
-- ----------------------------------------------------------------------------
