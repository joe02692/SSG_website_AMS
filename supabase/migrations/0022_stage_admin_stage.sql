-- ============================================================================
-- 0022 — Which stage a Stage Admin runs.
--
-- WHY
--
-- Seasonal plans can be added and deleted by the head site admin (any stage)
-- and by a stage admin (their own stage only). "Their own stage" has to be
-- something the stage admin cannot change themselves:
--
--   • leader_committees ("Stages you serve") is written by the leader from
--     their own details form, so any stage admin could tick every stage.
--   • profiles.requested_stage_id is what they typed at signup, and the
--     "update own" policy lets them change it.
--
-- So the head admin assigns it, at approval or when changing a role, and a
-- trigger stops a member's own session from ever editing it — the same rule
-- that already protects profiles.role (prevent_role_escalation).
--
-- The group allows two stage admins per stage. That is a reminder in the
-- members page, not a database rule, on purpose: the head admin decides.
--
-- Safe to run more than once.
-- ============================================================================

alter table public.profiles
  add column if not exists admin_stage_id smallint references public.stages (id) on delete set null;

comment on column public.profiles.admin_stage_id is
  'The stage a stage_admin runs (seasonal plan and future stage tools). Set only by the head site admin through the service role; NULL for every other role.';

create index if not exists profiles_admin_stage_idx
  on public.profiles (admin_stage_id)
  where admin_stage_id is not null;

-- A member's own session may not change it.
create or replace function public.prevent_admin_stage_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.admin_stage_id is distinct from old.admin_stage_id then
    if current_user in ('anon', 'authenticated')
       or coalesce(
            current_setting('request.jwt.claims', true)::jsonb ->> 'role',
            ''
          ) in ('anon', 'authenticated')
    then
      raise exception
        'profiles.admin_stage_id cannot be changed from a client connection'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_admin_stage_change on public.profiles;
create trigger profiles_prevent_admin_stage_change
  before update on public.profiles
  for each row execute function public.prevent_admin_stage_change();

-- Backfill the stage admins who already exist: the stage they asked for at
-- signup, or failing that the first stage they serve. The head admin can
-- change it afterwards from the members page ("Change role").
update public.profiles p
   set admin_stage_id = p.requested_stage_id
 where p.role = 'stage_admin'
   and p.admin_stage_id is null
   and p.requested_stage_id is not null;

update public.profiles p
   set admin_stage_id = (
         select min(lc.stage_id) from public.leader_committees lc
          where lc.profile_id = p.id
       )
 where p.role = 'stage_admin'
   and p.admin_stage_id is null;

notify pgrst, 'reload schema';
