-- 0027_lock_document_paths.sql
--
-- Security fixes found in the pre-launch review (1 Nov 2026).
--
-- 1. DOCUMENT PATHS ARE SET BY THE SERVER ONLY.
--    Until now a member could update their own scout_details.document_path
--    (or leader_details.id_card_path) straight through the Supabase API to
--    ANY key in the bucket — for example another member's birth certificate.
--    The site then trusted that key: "View document" signed it (reading
--    someone else's file), "Remove document" deleted it, and saving the form
--    copied it into the member's own folder. A parent could do the same
--    through a child's row.
--
--    From now on a client connection (anon / authenticated) may only:
--      • leave the path unchanged, or
--      • clear it (set it to NULL — "Remove document").
--    Setting a path, on INSERT or UPDATE, needs the service role, which only
--    the site's server code holds — after it has checked whose file it is.
--
-- 2. REVIEW FIELDS ON PROFILES ARE SERVER-ONLY.
--    requested_stage_id, requested_position, requested_at, reviewed_by and
--    reviewed_at could be edited by the member themselves. They are now
--    guarded like profiles.role.
--
-- 3. ANON CAN'T CALL MEMBER-ONLY FUNCTIONS.
--    "revoke ... from public" does not remove Supabase's default grant to
--    anon, so a visitor with no account could ask national_id_taken()
--    whether a national ID belongs to a member. Revoked from anon explicitly
--    (stage_admin_seats() stays public: the signup page needs it).
--
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- 1. Document paths
-- ---------------------------------------------------------------------------
create or replace function public.is_client_connection()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user in ('anon', 'authenticated')
      or coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '')
         in ('anon', 'authenticated');
$$;

comment on function public.is_client_connection() is
  'True for browser / member-session traffic (anon or authenticated), false for the service role and direct SQL. SECURITY INVOKER on purpose.';

create or replace function public.protect_document_path()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  column_name text := tg_argv[0];
  new_path text := to_jsonb(new) ->> column_name;
  old_path text := case when tg_op = 'UPDATE' then to_jsonb(old) ->> column_name end;
begin
  if not public.is_client_connection() then
    return new;
  end if;
  if new_path is null then
    return new; -- clearing is always allowed
  end if;
  if tg_op = 'UPDATE' and new_path is not distinct from old_path then
    return new; -- unchanged
  end if;
  raise exception '%.% can only be set by the server', tg_table_name, column_name
    using errcode = 'insufficient_privilege',
          hint = 'DOCUMENT_PATH_LOCKED';
end;
$$;

drop trigger if exists scout_details_protect_document_path on public.scout_details;
create trigger scout_details_protect_document_path
  before insert or update on public.scout_details
  for each row execute function public.protect_document_path('document_path');

drop trigger if exists leader_details_protect_document_path on public.leader_details;
create trigger leader_details_protect_document_path
  before insert or update on public.leader_details
  for each row execute function public.protect_document_path('id_card_path');

-- ---------------------------------------------------------------------------
-- 2. Profile review fields
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_review_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_client_connection() and (
       new.requested_stage_id is distinct from old.requested_stage_id
    or new.requested_position is distinct from old.requested_position
    or new.requested_at       is distinct from old.requested_at
    or new.reviewed_by        is distinct from old.reviewed_by
    or new.reviewed_at        is distinct from old.reviewed_at
  ) then
    raise exception 'profiles: request and review fields cannot be changed from a client connection'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_review_fields on public.profiles;
create trigger profiles_protect_review_fields
  before update on public.profiles
  for each row execute function public.protect_profile_review_fields();

-- ---------------------------------------------------------------------------
-- 3. Functions anon has no business calling
-- ---------------------------------------------------------------------------
do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.proname in (
         'national_id_taken', 'is_guardian_of', 'is_guardian_of_profile',
         'other_guardians', 'create_guardian_code', 'redeem_guardian_code',
         'copy_last_week_tools', 'can_edit_stage_tools', 'current_user_role',
         'is_staff', 'is_site_admin', 'is_head_site_admin',
         'invite_code_is_valid', 'rate_limit_hit'
       )
  loop
    execute format('revoke execute on function %s from anon', f);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Check (prints a NOTICE): any stored path outside the expected folders?
-- Only the server could have written a path since launch, but test data from
-- before this migration is worth a look.
-- ---------------------------------------------------------------------------
do $$
declare
  odd int;
begin
  select count(*) into odd from (
    select document_path as p from public.scout_details where document_path is not null
    union all
    select id_card_path from public.leader_details
  ) s
  where p not like 'Members/Scouts/%'
    and p not like 'Members/Leaders/%';
  if odd > 0 then
    raise notice '0027: % stored document path(s) are outside Members/Scouts or Members/Leaders — check them in the Table Editor.', odd;
  end if;
end;
$$;
