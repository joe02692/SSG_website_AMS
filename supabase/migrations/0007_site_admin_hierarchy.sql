-- ============================================================================
-- Four staff tiers, one ordered hierarchy.
--
--   head_site_admin   one account (you). Views members AND issues invite codes.
--   site_admin        the website team. Views members. Cannot issue codes.
--   stage_admin       a scouting leader, via invite code.
--   stage_leader      a scouting leader, via invite code. Least privileged.
--
-- This replaces the profiles.is_owner flag added in 0004: head_site_admin IS
-- the owner, and keeping two mechanisms for one idea would drift apart.
--
-- How each tier is assigned:
--   * head_site_admin / site_admin — by hand, by email, from the SQL editor
--     (see the bottom of this file). Never via invite code: whoever can mint
--     a code must not be able to mint site-level access.
--   * stage_admin / stage_leader   — by redeeming an invite code, whose
--     grants_role column decides which.
--
-- Run 0006 first, on its own.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Carry the existing owner across before the flag disappears
-- ----------------------------------------------------------------------------
update public.profiles
   set role = 'head_site_admin'
 where is_owner;

-- ----------------------------------------------------------------------------
-- 2. Predicates, narrowest to widest.
--    Policies should call these rather than comparing roles inline — when the
--    tiers gain distinct permissions, this is the only place to edit.
-- ----------------------------------------------------------------------------
create or replace function public.is_head_site_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select role = 'head_site_admin'
        from public.profiles
       where id = (select auth.uid())
    ),
    false
  );
$$;

comment on function public.is_head_site_admin() is
  'True only for the single head site admin. Gates invite-code creation and revocation.';

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select role in ('site_admin', 'head_site_admin')
        from public.profiles
       where id = (select auth.uid())
    ),
    false
  );
$$;

comment on function public.is_site_admin() is
  'True for site-level staff (site_admin and head_site_admin). Gates the members list.';

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select role in (
        'stage_leader', 'stage_admin', 'site_admin', 'head_site_admin', 'leader'
      )
        from public.profiles
       where id = (select auth.uid())
    ),
    false
  );
$$;

comment on function public.is_staff() is
  'True for any non-member role. Supersedes is_leader().';

-- ----------------------------------------------------------------------------
-- 3. The role guard, minus the is_owner column that is about to be dropped.
--
--    Still SECURITY INVOKER on purpose: it must see the *caller*, and
--    SECURITY DEFINER would report the function owner instead. PostgREST
--    switches the connection role to anon/authenticated for browser traffic;
--    the SQL editor arrives as postgres and is allowed through.
-- ----------------------------------------------------------------------------
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    if current_user in ('anon', 'authenticated')
       or coalesce(
            current_setting('request.jwt.claims', true)::jsonb ->> 'role',
            ''
          ) in ('anon', 'authenticated')
    then
      raise exception
        'profiles.role cannot be changed from a client connection'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. Policies
-- ----------------------------------------------------------------------------

-- Site-level staff read every profile; stage leaders do not (they'll get their
-- own stage's members once the stages table exists — DBMS follow-up).
drop policy if exists "profiles: leaders read all" on public.profiles;
drop policy if exists "profiles: site admins read all" on public.profiles;
create policy "profiles: site admins read all"
  on public.profiles for select
  to authenticated
  using (public.is_site_admin());

-- Issuing invite codes is the head site admin's privilege alone: whoever can
-- mint a code decides who joins as staff.
drop policy if exists "leader_invites: owner manages" on public.leader_invites;
drop policy if exists "leader_invites: head admin manages" on public.leader_invites;
create policy "leader_invites: head admin manages"
  on public.leader_invites for all
  to authenticated
  using (public.is_head_site_admin())
  with check (public.is_head_site_admin());

-- ----------------------------------------------------------------------------
-- 5. Retire the is_owner flag and its helper
-- ----------------------------------------------------------------------------
drop function if exists public.is_owner();
drop function if exists public.is_leader();

alter table public.profiles drop column if exists is_owner;

-- ----------------------------------------------------------------------------
-- 6. Assigning site-level roles. CHANGE THE EMAILS, then run.
--
-- Head site admin — exactly one. Safe to re-run.
-- ----------------------------------------------------------------------------
update public.profiles
   set role = 'head_site_admin'
 where id = (
   select id from auth.users where email = 'joeelbasiouny@gmail.com'
 );

-- Site admins — the website team. Add addresses to the list and re-run.
-- (Left commented out until the emails are known.)
--
-- update public.profiles
--    set role = 'site_admin'
--  where id in (
--    select id from auth.users
--     where email in (
--       'teammate-one@example.com',
--       'teammate-two@example.com'
--     )
--  );
