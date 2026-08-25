-- ============================================================================
-- El-Salam Scouting Group AMS — profiles, roles and leader invites
--
-- Why this table exists at all:
--   Supabase exposes auth.updateUser() to the browser with the member's own
--   access token. If `role` lived only in raw_user_meta_data, any signed-in
--   scout could promote themselves to leader from the browser console.
--   The authoritative role therefore lives in a table that RLS protects and
--   that only a SECURITY DEFINER trigger may write.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Role enum
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('scout', 'leader', 'parent');
  end if;
end
$$;

-- ----------------------------------------------------------------------------
-- 2. Profiles
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  role        public.user_role not null default 'scout',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Authoritative member record. profiles.role is the only trustworthy source of a user''s role; never read the role from the JWT metadata.';

create index if not exists profiles_role_idx on public.profiles (role);

-- ----------------------------------------------------------------------------
-- 3. Leader invite codes
--    Leader accounts are never self-served. A code is single-use.
-- ----------------------------------------------------------------------------
create table if not exists public.leader_invites (
  code        text primary key,
  note        text,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz,
  used_by     uuid references auth.users (id) on delete set null,
  used_at     timestamptz
);

comment on table public.leader_invites is
  'Single-use codes that upgrade a signup to the leader role. Validated inside handle_new_user(), so the check holds even if someone calls the Supabase signup endpoint directly.';

-- ----------------------------------------------------------------------------
-- 4. New-user trigger
--
--    Runs as SECURITY DEFINER so it can read leader_invites and write
--    profiles.role, which no client-side connection is permitted to do.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested   text;
  invite_code text;
  final_role  public.user_role;
begin
  requested   := nullif(trim(new.raw_user_meta_data ->> 'requested_role'), '');
  invite_code := nullif(trim(new.raw_user_meta_data ->> 'leader_invite_code'), '');

  -- Self-service roles only. Anything unrecognised (including a bare-faced
  -- "leader" passed straight to the signup endpoint) falls back to scout.
  final_role := case
                  when requested = 'parent' then 'parent'::public.user_role
                  else 'scout'::public.user_role
                end;

  -- A valid, unused, unexpired code is the only path to leader.
  if invite_code is not null then
    update public.leader_invites
       set used_by = new.id,
           used_at = now()
     where code = invite_code
       and used_by is null
       and (expires_at is null or expires_at > now());

    if found then
      final_role := 'leader'::public.user_role;
    end if;
  end if;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    final_role
  )
  on conflict (id) do nothing;

  -- Don't leave the (now spent) code sitting in the user's metadata.
  if invite_code is not null then
    update auth.users
       set raw_user_meta_data = raw_user_meta_data - 'leader_invite_code'
     where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 5. Block client-side role changes
-- ----------------------------------------------------------------------------
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    if coalesce(
         current_setting('request.jwt.claims', true)::jsonb ->> 'role',
         ''
       ) <> 'service_role'
    then
      raise exception
        'profiles.role cannot be changed from a client connection'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- keep updated_at honest
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 6. Role lookup helper
--
--    RLS policies on public.profiles cannot themselves SELECT from
--    public.profiles without recursing. A SECURITY DEFINER function reads
--    past RLS and breaks the loop.
-- ----------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

-- ----------------------------------------------------------------------------
-- 7. Row Level Security
-- ----------------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.leader_invites enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles: leaders read all" on public.profiles;
create policy "profiles: leaders read all"
  on public.profiles for select
  to authenticated
  using (public.current_user_role() = 'leader');

-- Members may edit their own details. The role column is separately
-- guarded by prevent_role_escalation(), so this cannot grant a promotion.
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No INSERT or DELETE policy: rows are created by the trigger and removed
-- by the cascade from auth.users. Absent policy = denied under RLS.

drop policy if exists "leader_invites: leaders manage" on public.leader_invites;
create policy "leader_invites: leaders manage"
  on public.leader_invites for all
  to authenticated
  using (public.current_user_role() = 'leader')
  with check (public.current_user_role() = 'leader');

-- ----------------------------------------------------------------------------
-- 8. Grants
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.leader_invites to authenticated;

-- ----------------------------------------------------------------------------
-- 9. Bootstrapping your first leader
--
--    Chicken-and-egg: only a leader can mint invite codes, and there are no
--    leaders yet. Run these two statements ONCE from the Supabase SQL editor
--    (which connects as a privileged role and bypasses RLS):
--
--      insert into public.leader_invites (code, note)
--      values ('ELSALAM-FOUNDER-2026', 'first group leader');
--
--    Then sign up through /signup with that code. Afterwards, mint further
--    codes from the app as a leader.
-- ----------------------------------------------------------------------------
