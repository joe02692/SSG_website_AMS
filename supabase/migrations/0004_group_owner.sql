-- ============================================================================
-- Group owner flag.
--
-- Restricts member management and invite minting to ONE specific account,
-- rather than to a role. Implemented as a column instead of a hardcoded user
-- id in application code, because:
--   * the repo is public — a UUID in source is there forever
--   * moving ownership becomes one UPDATE, not a code change and a redeploy
--   * it survives the account being recreated (just re-flag the new row)
--
-- Exactly one row should have is_owner = true. Nothing enforces that here;
-- it's set by hand at the bottom of this file.
-- ============================================================================

alter table public.profiles
  add column if not exists is_owner boolean not null default false;

comment on column public.profiles.is_owner is
  'The single group owner. Gates member management and invite minting. Never client-writable — see prevent_role_escalation().';

-- ----------------------------------------------------------------------------
-- Owner check, for RLS policies
-- ----------------------------------------------------------------------------
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select is_owner from public.profiles where id = (select auth.uid())),
    false
  );
$$;

comment on function public.is_owner() is
  'True only for the group owner. Narrower than is_leader().';

-- ----------------------------------------------------------------------------
-- The flag must be as unforgeable as the role.
--
-- Note this function is SECURITY INVOKER (the default) on purpose: it needs
-- to see who the *caller* is, and SECURITY DEFINER would report the function
-- owner instead, defeating the whole check.
--
-- PostgREST switches the connection role to `anon` or `authenticated` for
-- every browser-originated request, so testing current_user identifies client
-- traffic exactly. A direct connection — the Supabase SQL editor, psql, a
-- migration — arrives as `postgres` and is allowed through. The earlier
-- version of this guard tested for `service_role` in the JWT claims and so
-- rejected the SQL editor too, which has no claims at all.
-- ----------------------------------------------------------------------------
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     or new.is_owner is distinct from old.is_owner
  then
    if current_user in ('anon', 'authenticated')
       or coalesce(
            current_setting('request.jwt.claims', true)::jsonb ->> 'role',
            ''
          ) in ('anon', 'authenticated')
    then
      raise exception
        'profiles.role and profiles.is_owner cannot be changed from a client connection'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Invite codes are the owner's privilege alone: whoever can mint a
-- stage_admin code can hand out the keys to the group.
-- ----------------------------------------------------------------------------
drop policy if exists "leader_invites: leaders manage" on public.leader_invites;
drop policy if exists "leader_invites: owner manages" on public.leader_invites;
create policy "leader_invites: owner manages"
  on public.leader_invites for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- Note: "profiles: leaders read all" stays on is_leader(). Stage leaders will
-- need to read their own stage's members once the stages table exists;
-- narrowing that to their own stage is a follow-up for the DBMS team.

-- ----------------------------------------------------------------------------
-- Claim ownership. CHANGE THE EMAIL if yours differs, then run.
-- Safe to re-run: it clears any existing owner first.
-- ----------------------------------------------------------------------------
update public.profiles set is_owner = false where is_owner;

update public.profiles
   set is_owner = true
 where id = (
   select id from auth.users where email = 'joeelbasiouny@gmail.com'
 );
