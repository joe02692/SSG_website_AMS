-- ============================================================================
-- Leader access by request and approval, replacing invite codes.
--
-- WHY THE CHANGE
--
-- An invite code is a bearer token: whoever holds it becomes a leader. Codes
-- get forwarded, screenshotted and pasted into group chats, and the head admin
-- only learns who used one after they are already inside. A request inverts
-- that — the person is identified BEFORE they have any access, and the
-- approval is a recorded decision by a named person.
--
-- What it costs, honestly: previously, no code meant no account at all. Now
-- anyone can create an account that sits pending. Such an account can do
-- nothing whatsoever, but it is a spam surface that did not exist before, so
-- rate limiting on the auth endpoints matters more than it did yesterday.
--
-- RUN 0016 FIRST, in a separate execution. It adds the enum value this
-- migration assigns, and Postgres refuses to use a new enum value inside the
-- transaction that created it.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Request fields on the profile
--
-- On profiles rather than a separate requests table, deliberately. The request
-- IS the account's early life, not a separate object: one row, one status, no
-- possibility of a profile and a request disagreeing about who someone is.
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists requested_stage_id smallint references public.stages (id),
  add column if not exists requested_at       timestamptz,
  add column if not exists reviewed_by        uuid references public.profiles (id) on delete set null,
  add column if not exists reviewed_at        timestamptz;

comment on column public.profiles.requested_stage_id is
  'The stage the applicant said they work with. Context for the approval decision, and a sensible prefill for onboarding. Not authoritative — leader_committees is.';
comment on column public.profiles.requested_at is
  'When they asked. NULL for scouts, who need no approval.';
comment on column public.profiles.reviewed_by is
  'Which head admin approved them. Kept so an approval is attributable months later.';

create index if not exists profiles_pending_idx
  on public.profiles (requested_at)
  where role = 'pending_leader';

-- ----------------------------------------------------------------------------
-- 2. Signup writes a REQUEST, never a role
--
-- The security property that matters, and the reason this is a trigger rather
-- than application code: raw_user_meta_data is attacker-controlled. Anyone can
-- POST directly to the Supabase signup endpoint with the anon key and put
-- whatever they like in it. So metadata may express a WISH and nothing more.
-- The only staff role this function can ever write is `pending_leader`, which
-- grants nothing. Every real role is assigned later by a head admin acting
-- through the service role.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested  text;
  stage_code text;
  stage_id   smallint;
  final_role public.user_role;
  is_request boolean := false;
begin
  requested  := nullif(trim(new.raw_user_meta_data ->> 'requested_role'), '');
  stage_code := nullif(trim(new.raw_user_meta_data ->> 'requested_stage'), '');

  if requested = 'leader' then
    -- Asking to lead. Parked with no privileges until someone approves.
    final_role := 'pending_leader'::public.user_role;
    is_request := true;
  elsif requested = 'parent' then
    final_role := 'parent'::public.user_role;
  else
    -- Anything unrecognised, including a bare-faced 'head_site_admin' passed
    -- straight to the signup endpoint, lands here.
    final_role := 'scout'::public.user_role;
  end if;

  if stage_code is not null then
    select s.id into stage_id from public.stages s where s.code = stage_code;
  end if;

  insert into public.profiles (id, full_name, role, requested_stage_id, requested_at)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    final_role,
    case when is_request then stage_id else null end,
    case when is_request then now() else null end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates the profile on signup. Can only ever assign scout, parent or pending_leader — never a role that grants access. Approval is a separate, authenticated act.';

-- ----------------------------------------------------------------------------
-- 3. A pending account is not staff
--
-- These helpers back the RLS policies across the schema. If pending_leader
-- ever satisfied is_staff(), every leader-facing policy would open to anyone
-- who filled in the signup form. Re-asserted here so the guarantee is stated
-- in the same migration that introduces the role, rather than inherited
-- silently from an enum list written months ago.
-- ----------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
     where p.id = (select auth.uid())
       and p.role in ('leader', 'stage_leader', 'stage_admin',
                      'site_admin', 'head_site_admin')
  );
$$;

-- ----------------------------------------------------------------------------
-- 4. Invite codes are retired
--
-- The table is left in place, not dropped. It records who joined by which code
-- and when, which is the only history of how the current leaders got in; that
-- is worth more than a tidy schema. Nothing reads or writes it any more.
--
-- To remove it once that history stops mattering:
--   drop function if exists public.invite_code_is_valid(text);
--   drop table if exists public.leader_invites;
-- ----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.leader_invites') is not null then
    comment on table public.leader_invites is
      'RETIRED as of 0017. Leader access is now requested and approved (see profiles.requested_at). Kept only as a record of how existing leaders joined. Nothing reads this table.';
  end if;
end
$$;

-- Stop the anon role being able to probe codes now that none are issued.
--
-- Guarded because REVOKE on something that isn't there is a hard error, and
-- this file has to survive being run against a database that skipped 0012 —
-- or being run twice, which happens.
do $$
begin
  if to_regprocedure('public.invite_code_is_valid(text)') is not null then
    revoke execute on function public.invite_code_is_valid(text) from anon, authenticated;
  end if;
  if to_regclass('public.leader_invites') is not null then
    revoke insert, update, delete on public.leader_invites from authenticated;
  end if;
end
$$;

-- ----------------------------------------------------------------------------
-- 5. Privileges
--
-- GRANT and RLS are separate gates and both must open — 0014 shipped without
-- this block and every leader hit "permission denied" while the policies were
-- perfect. Not repeating that.
-- ----------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;

notify pgrst, 'reload schema';
