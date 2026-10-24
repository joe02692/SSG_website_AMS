-- ============================================================================
-- 0025 — Parent accounts and their children.
--
-- WHAT A PARENT CAN DO (Zyad, Oct 2026)
--   • Sign up as a parent. Works at once — no approval: a parent sees only
--     children they added themselves or linked with the child's own code.
--   • Add a child: the child's details and birth certificate, with no login
--     of the child's own. One parent account covers brothers and sisters.
--   • Link an older scout who already has an account, with a code that the
--     scout makes on their own dashboard. Nobody can attach themselves to a
--     child without that child's login.
--   • View and edit their children's details.
--
-- HOW
--   1. scout_details gets its own id. profile_id (the scout's login) becomes
--      optional: NULL for a child a parent registered. Such a row keeps the
--      child's name in scout_details.full_name.
--   2. public.guardianships links parent ↔ child row. Created automatically
--      when a parent adds a child, or by redeem_guardian_code() for a link.
--   3. public.parent_details — the parent's phone, relationship to the
--      child(ren), and when they gave consent for the group to keep their
--      children's data (Egypt's PDPL expects a parent's consent for minors).
--   4. public.guardian_link_codes — one-time codes, 7 days, made by a scout.
--   5. The national-ID rules from 0024 are corrected for rows with no login.
--
-- Safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. scout_details: its own id, optional login, a name for children
-- ---------------------------------------------------------------------------
alter table public.scout_details
  add column if not exists id uuid default gen_random_uuid();
update public.scout_details set id = gen_random_uuid() where id is null;
alter table public.scout_details alter column id set not null;

alter table public.scout_details
  add column if not exists full_name text,
  add column if not exists added_by uuid references public.profiles (id) on delete set null;

comment on column public.scout_details.full_name is
  'The child''s name when a parent registered them (profile_id is NULL). Members with their own login use profiles.full_name.';
comment on column public.scout_details.added_by is
  'The parent who registered this child, if a parent did.';

-- The primary key moves from profile_id to id. The view built on d.* has to
-- go first and come back afterwards.
drop view if exists public.scout_details_with_age;

do $$
begin
  if exists (
    select 1 from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
     where c.conrelid = 'public.scout_details'::regclass
       and c.contype = 'p'
       and a.attname = 'profile_id'
  ) then
    alter table public.scout_details drop constraint scout_details_pkey;
    alter table public.scout_details add constraint scout_details_pkey primary key (id);
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.scout_details'::regclass
       and conname = 'scout_details_profile_id_key'
  ) then
    alter table public.scout_details
      add constraint scout_details_profile_id_key unique (profile_id);
  end if;
end;
$$;

alter table public.scout_details alter column profile_id drop not null;

alter table public.scout_details drop constraint if exists scout_details_name_when_no_login;
alter table public.scout_details
  add constraint scout_details_name_when_no_login
  check (profile_id is not null or length(btrim(coalesce(full_name, ''))) > 0);

create or replace view public.scout_details_with_age
  with (security_invoker = true)
as
  select d.*, public.age_years(d.date_of_birth) as age
  from public.scout_details d;

grant select on public.scout_details_with_age to authenticated;

-- A client may never move a row to another person.
create or replace function public.protect_scout_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.id is distinct from old.id
      or new.profile_id is distinct from old.profile_id
      or new.added_by is distinct from old.added_by)
     and (current_user in ('anon', 'authenticated')
          or coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '')
             in ('anon', 'authenticated'))
  then
    raise exception 'scout_details: id, profile_id and added_by cannot be changed from a client connection'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

drop trigger if exists scout_details_protect_identity on public.scout_details;
create trigger scout_details_protect_identity
  before update on public.scout_details
  for each row execute function public.protect_scout_identity();

-- ---------------------------------------------------------------------------
-- 2. Guardianships
-- ---------------------------------------------------------------------------
create table if not exists public.guardianships (
  guardian_id uuid        not null references public.profiles (id) on delete cascade,
  scout_id    uuid        not null references public.scout_details (id) on delete cascade,
  how         text        not null default 'added' check (how in ('added', 'linked')),
  created_at  timestamptz not null default now(),
  primary key (guardian_id, scout_id)
);

comment on table public.guardianships is
  'Which parent account looks after which child (scout_details row). added = the parent registered the child; linked = joined with the scout''s code.';

create index if not exists guardianships_scout_idx on public.guardianships (scout_id);

create or replace function public.is_guardian_of(p_scout uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.guardianships g
     where g.scout_id = p_scout
       and g.guardian_id = (select auth.uid())
  );
$$;

revoke all on function public.is_guardian_of(uuid) from public;
grant execute on function public.is_guardian_of(uuid) to authenticated, service_role;

-- A parent may read the profile (name) of a linked child who has their own login.
create or replace function public.is_guardian_of_profile(p_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.guardianships g
      join public.scout_details s on s.id = g.scout_id
     where s.profile_id = p_profile
       and g.guardian_id = (select auth.uid())
  );
$$;

revoke all on function public.is_guardian_of_profile(uuid) from public;
grant execute on function public.is_guardian_of_profile(uuid) to authenticated, service_role;

drop policy if exists "profiles: guardians read their children" on public.profiles;
create policy "profiles: guardians read their children"
  on public.profiles for select
  to authenticated
  using (public.is_guardian_of_profile(id));

-- How many OTHER parents look after one of my children. A parent can't see
-- other parents' links (RLS), but needs this to know whether removing a child
-- removes the record or only their own link.
create or replace function public.other_guardians(p_scout uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
           when public.is_guardian_of(p_scout) then (
             select count(*)::integer from public.guardianships g
              where g.scout_id = p_scout and g.guardian_id <> (select auth.uid())
           )
           else 0
         end;
$$;

revoke all on function public.other_guardians(uuid) from public;
grant execute on function public.other_guardians(uuid) to authenticated, service_role;

-- When a parent adds a child, the link is made in the same statement.
create or replace function public.link_added_child()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.profile_id is null and new.added_by is not null then
    insert into public.guardianships (guardian_id, scout_id, how)
    values (new.added_by, new.id, 'added')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists scout_details_link_added_child on public.scout_details;
create trigger scout_details_link_added_child
  after insert on public.scout_details
  for each row execute function public.link_added_child();

alter table public.guardianships enable row level security;

drop policy if exists "guardianships: read own" on public.guardianships;
create policy "guardianships: read own"
  on public.guardianships for select
  to authenticated
  using (
    guardian_id = (select auth.uid())
    or exists (
      select 1 from public.scout_details s
       where s.id = scout_id and s.profile_id = (select auth.uid())
    )
  );

drop policy if exists "guardianships: site admins read all" on public.guardianships;
create policy "guardianships: site admins read all"
  on public.guardianships for select
  to authenticated
  using (public.is_site_admin());

-- A parent may unlink a child; a scout may remove a parent link.
drop policy if exists "guardianships: delete own" on public.guardianships;
create policy "guardianships: delete own"
  on public.guardianships for delete
  to authenticated
  using (
    guardian_id = (select auth.uid())
    or exists (
      select 1 from public.scout_details s
       where s.id = scout_id and s.profile_id = (select auth.uid())
    )
  );

-- No insert policy: links are made only by the trigger above and by
-- redeem_guardian_code() below.

-- ---------------------------------------------------------------------------
-- 3. What parents may do with scout_details
-- ---------------------------------------------------------------------------
drop policy if exists "scout_details: guardians read" on public.scout_details;
create policy "scout_details: guardians read"
  on public.scout_details for select
  to authenticated
  using (public.is_guardian_of(id));

drop policy if exists "scout_details: guardians update" on public.scout_details;
create policy "scout_details: guardians update"
  on public.scout_details for update
  to authenticated
  using (public.is_guardian_of(id))
  with check (public.is_guardian_of(id));

-- A parent registers a child with no login of their own.
drop policy if exists "scout_details: parents add children" on public.scout_details;
create policy "scout_details: parents add children"
  on public.scout_details for insert
  to authenticated
  with check (
    profile_id is null
    and added_by = (select auth.uid())
    and public.current_user_role() = 'parent'
  );

-- A parent may remove a child they registered (not a scout with a login).
drop policy if exists "scout_details: guardians delete added children" on public.scout_details;
create policy "scout_details: guardians delete added children"
  on public.scout_details for delete
  to authenticated
  using (profile_id is null and public.is_guardian_of(id));

drop policy if exists "scout_details: head admin delete" on public.scout_details;
create policy "scout_details: head admin delete"
  on public.scout_details for delete
  to authenticated
  using (public.is_head_site_admin());

-- ---------------------------------------------------------------------------
-- 4. Parent details
-- ---------------------------------------------------------------------------
create table if not exists public.parent_details (
  profile_id   uuid        primary key references public.profiles (id) on delete cascade,
  phone        varchar(11) not null check (phone ~ '^01[0-9]{9}$'),
  relationship text        not null check (relationship in ('father', 'mother', 'guardian')),
  consent_at   timestamptz not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.parent_details is
  'A parent''s contact phone, relationship, and when they agreed to the group keeping their children''s data.';

drop trigger if exists parent_details_touch_updated_at on public.parent_details;
create trigger parent_details_touch_updated_at
  before update on public.parent_details
  for each row execute function public.touch_updated_at();

alter table public.parent_details enable row level security;

drop policy if exists "parent_details: own" on public.parent_details;
create policy "parent_details: own"
  on public.parent_details for all
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists "parent_details: site admins read all" on public.parent_details;
create policy "parent_details: site admins read all"
  on public.parent_details for select
  to authenticated
  using (public.is_site_admin());

-- ---------------------------------------------------------------------------
-- 5. Link codes (a scout invites their parent)
-- ---------------------------------------------------------------------------
create table if not exists public.guardian_link_codes (
  code       text        primary key,
  scout_id   uuid        not null references public.scout_details (id) on delete cascade,
  created_by uuid        not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at    timestamptz,
  used_by    uuid references public.profiles (id) on delete set null
);

alter table public.guardian_link_codes enable row level security;

drop policy if exists "guardian_link_codes: read own" on public.guardian_link_codes;
create policy "guardian_link_codes: read own"
  on public.guardian_link_codes for select
  to authenticated
  using (created_by = (select auth.uid()));

-- Made by the scout, for their own row. Any older unused code is cancelled.
create or replace function public.create_guardian_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  my_scout uuid;
  hex      text;
  new_code text;
  i        integer;
begin
  select s.id into my_scout
    from public.scout_details s
   where s.profile_id = (select auth.uid());
  if my_scout is null then
    raise exception 'no scout details for this account'
      using errcode = 'P0001', hint = 'NO_SCOUT_ROW';
  end if;

  update public.guardian_link_codes
     set expires_at = now()
   where scout_id = my_scout and used_at is null and expires_at > now();

  loop
    -- gen_random_uuid() draws from a cryptographic source; 8 characters from
    -- a 32-letter alphabet (no 0/O, 1/I) is 40 bits.
    hex := replace(gen_random_uuid()::text, '-', '');
    new_code := '';
    for i in 0..7 loop
      new_code := new_code || substr(
        alphabet,
        (('x' || substr(hex, i * 2 + 1, 2))::bit(8)::int % 32) + 1,
        1
      );
    end loop;
    exit when not exists (select 1 from public.guardian_link_codes c where c.code = new_code);
  end loop;

  insert into public.guardian_link_codes (code, scout_id, created_by)
  values (new_code, my_scout, (select auth.uid()));

  return new_code;
end;
$$;

-- Used by a parent. Returns the linked child's row id.
create or replace function public.redeem_guardian_code(p_code text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  found_code public.guardian_link_codes%rowtype;
begin
  if public.current_user_role() is distinct from 'parent' then
    raise exception 'only parent accounts can link a child'
      using errcode = 'P0001', hint = 'NOT_PARENT';
  end if;

  select * into found_code
    from public.guardian_link_codes c
   where c.code = upper(btrim(p_code))
   for update;

  if not found or found_code.used_at is not null or found_code.expires_at <= now() then
    raise exception 'that code is not valid'
      using errcode = 'P0001', hint = 'BAD_CODE';
  end if;

  insert into public.guardianships (guardian_id, scout_id, how)
  values ((select auth.uid()), found_code.scout_id, 'linked')
  on conflict do nothing;

  update public.guardian_link_codes
     set used_at = now(), used_by = (select auth.uid())
   where code = found_code.code;

  return found_code.scout_id;
end;
$$;

revoke all on function public.create_guardian_code() from public;
revoke all on function public.redeem_guardian_code(text) from public;
grant execute on function public.create_guardian_code() to authenticated;
grant execute on function public.redeem_guardian_code(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. National IDs (0024) — correct for rows with no login
-- ---------------------------------------------------------------------------
-- Optional second argument: the child row being edited, so a parent editing
-- their own child isn't told the child's number is "taken".
create or replace function public.national_id_taken(p_national_id text, p_exclude uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
           select 1 from public.scout_details d
            where d.national_id = p_national_id
              and d.profile_id is distinct from (select auth.uid())
              and d.id is distinct from p_exclude
         )
      or exists (
           select 1 from public.leader_details d
            where d.national_id = p_national_id
              and d.profile_id is distinct from (select auth.uid())
         );
$$;

revoke all on function public.national_id_taken(text, uuid) from public;
grant execute on function public.national_id_taken(text, uuid) to authenticated, service_role;

create or replace function public.enforce_unique_national_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.national_id is null then
    return new;
  end if;

  if tg_table_name = 'scout_details' then
    -- A child with no login (profile_id NULL) clashes with every leader.
    if exists (
      select 1 from public.leader_details l
       where l.national_id = new.national_id
         and (new.profile_id is null or l.profile_id <> new.profile_id)
    ) then
      raise exception 'national_id % is already registered', new.national_id
        using errcode = 'unique_violation';
    end if;
  else
    if exists (
      select 1 from public.scout_details s
       where s.national_id = new.national_id
         and (s.profile_id is null or s.profile_id <> new.profile_id)
    ) then
      raise exception 'national_id % is already registered', new.national_id
        using errcode = 'unique_violation';
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Grants (GRANT and RLS are separate gates — see 0015 and 0018)
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.scout_details to authenticated;
grant select, delete on public.guardianships to authenticated;
grant select, insert, update on public.parent_details to authenticated;
grant select on public.guardian_link_codes to authenticated;

grant select, insert, update, delete on public.guardianships to service_role;
grant select, insert, update, delete on public.parent_details to service_role;
grant select, insert, update, delete on public.guardian_link_codes to service_role;

notify pgrst, 'reload schema';
