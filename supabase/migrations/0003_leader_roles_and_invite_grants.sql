-- ============================================================================
-- Splits the single `leader` role into `stage_admin` and `stage_leader`,
-- and makes each invite code declare which of the two it grants.
--
-- Run 0002 first, on its own. This file uses the enum values it adds.
--
-- NOTE FOR THE DBMS TEAM: this touches handle_new_user(), the signup path we
-- asked you not to change unilaterally. Backend made this change; the
-- security property it protects is unchanged — a leader-level role is still
-- only reachable by redeeming a valid, unused, unexpired invite code, and the
-- decision is still made inside this SECURITY DEFINER trigger rather than
-- trusted from the client.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Each invite declares the role it grants
-- ----------------------------------------------------------------------------
alter table public.leader_invites
  add column if not exists grants_role public.user_role
    not null default 'stage_leader';

comment on column public.leader_invites.grants_role is
  'Which leader-level role redeeming this code grants. Set when the code is minted; read by handle_new_user().';

-- Codes that predate this column were all founder/admin codes.
update public.leader_invites
   set grants_role = 'stage_admin'
 where grants_role = 'stage_leader'
   and created_at < now();

-- ----------------------------------------------------------------------------
-- 2. Migrate existing leaders
--    The founders who signed up under the old single role become stage admins.
-- ----------------------------------------------------------------------------
update public.profiles
   set role = 'stage_admin'
 where role = 'leader';

-- ----------------------------------------------------------------------------
-- 3. Leader-level check
--    Both new roles carry leader-level access for now; the two are not yet
--    differentiated by permission. When they diverge, change this function
--    and the policies that call it rather than hunting for role comparisons.
-- ----------------------------------------------------------------------------
create or replace function public.is_leader()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select role in ('stage_admin', 'stage_leader', 'leader')
        from public.profiles
       where id = (select auth.uid())
    ),
    false
  );
$$;

comment on function public.is_leader() is
  'True when the caller holds any leader-level role. SECURITY DEFINER so RLS policies on profiles can call it without recursing.';

-- ----------------------------------------------------------------------------
-- 4. Signup trigger — the granted role now comes from the invite
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
  granted     public.user_role;
  final_role  public.user_role;
begin
  requested   := nullif(trim(new.raw_user_meta_data ->> 'requested_role'), '');
  invite_code := nullif(trim(new.raw_user_meta_data ->> 'leader_invite_code'), '');

  -- Self-service roles only. Anything unrecognised — including a bare-faced
  -- 'stage_admin' passed straight to the signup endpoint — becomes a scout.
  final_role := case
                  when requested = 'parent' then 'parent'::public.user_role
                  else 'scout'::public.user_role
                end;

  -- A valid, unused, unexpired code is the only path to a leader-level role,
  -- and the code itself decides which one.
  if invite_code is not null then
    update public.leader_invites
       set used_by = new.id,
           used_at = now()
     where code = invite_code
       and used_by is null
       and (expires_at is null or expires_at > now())
    returning grants_role into granted;

    -- `granted` stays null when no row matched, so an invalid or spent code
    -- silently leaves the member as a scout.
    if granted is not null then
      final_role := granted;
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

-- ----------------------------------------------------------------------------
-- 5. Policies that used to compare against 'leader'
-- ----------------------------------------------------------------------------
drop policy if exists "profiles: leaders read all" on public.profiles;
create policy "profiles: leaders read all"
  on public.profiles for select
  to authenticated
  using (public.is_leader());

drop policy if exists "leader_invites: leaders manage" on public.leader_invites;
create policy "leader_invites: leaders manage"
  on public.leader_invites for all
  to authenticated
  using (public.is_leader())
  with check (public.is_leader());
