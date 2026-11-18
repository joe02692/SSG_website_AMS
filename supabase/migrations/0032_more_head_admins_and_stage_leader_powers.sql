-- ============================================================================
-- 0032 — Three head site admins, and the stage leader seat runs its stage
--        (18 Nov 2026)
--
--   1. profiles.is_site_owner: the "Website owner" crown on the public profile
--      belongs to one person (Zyad), not to every head site admin. Set here
--      for whoever is head site admin BEFORE the new ones are added, and never
--      changeable from the website.
--   2. Two more head site admins, with exactly the same powers:
--        fatema.m.r.zaki.07@gmail.com
--        amhbadr2006@gmail.com
--      They must have signed up first; an address with no account is simply
--      skipped (run this file again after they sign up — it is safe to).
--   3. The leader who holds a stage's "Stage leader" seat (قائد المرحلة,
--      stage_titles.title = 'leader', 0028) has the same powers over that
--      stage as its stage admins: weekly tools, the stage's event papers,
--      scout approval (and, in the app, the seasonal plans). With the two
--      stage admins that makes three people per stage. The seat still frees
--      itself when its holder stops serving the stage (0030), and the powers
--      go with it.
--
-- Safe to run more than once.
-- ============================================================================

-- --------------------------------------------------------- 1. website owner
alter table public.profiles
  add column if not exists is_site_owner boolean not null default false;

comment on column public.profiles.is_site_owner is
  'Shows the "Website owner" badge on the public profile (0032). Set only by SQL / the service role.';

-- First run only: the head site admin(s) of today are the owner.
update public.profiles
   set is_site_owner = true
 where role = 'head_site_admin'
   and not exists (select 1 from public.profiles where is_site_owner);

create or replace function public.prevent_site_owner_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_site_owner is distinct from old.is_site_owner and public.is_client_connection() then
    raise exception 'profiles.is_site_owner cannot be changed from a client connection'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_site_owner_change on public.profiles;
create trigger profiles_prevent_site_owner_change
  before update on public.profiles
  for each row execute function public.prevent_site_owner_change();

-- ------------------------------------------------- 2. two more head admins
update public.profiles p
   set role = 'head_site_admin',
       admin_stage_id = null
  from auth.users u
 where u.id = p.id
   and lower(u.email) in ('fatema.m.r.zaki.07@gmail.com', 'amhbadr2006@gmail.com')
   and p.role is distinct from 'head_site_admin';

-- The public profile's crown follows is_site_owner now.
drop function if exists public.public_leaders();

create function public.public_leaders()
returns table (
  id          uuid,
  full_name   text,
  photo_key   text,
  about       text,
  age         integer,
  university  text,
  faculty     text,
  graduate    boolean,
  join_year   smallint,
  stages      text[],
  titles      jsonb,
  committees  text[],
  is_owner    boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id,
         p.full_name,
         lp.photo_key,
         lp.about,
         public.age_years(d.date_of_birth)::integer,
         d.university::text,
         d.faculty::text,
         d.applicant_status = 'graduate',
         d.join_year,
         array(
           select s.code from public.stages s
            where public.serves_stage(p.id, s.id)
            order by s.sort
         ),
         coalesce((
           select jsonb_agg(jsonb_build_object('stage', s.code, 'title', t.title) order by s.sort)
             from public.stage_titles t
             join public.stages s on s.id = t.stage_id
            where t.profile_id = p.id
              and public.serves_stage(p.id, t.stage_id)
         ), '[]'::jsonb),
         coalesce(d.committees, '{}'::text[]),
         p.is_site_owner
    from public.leader_profiles lp
    join public.profiles p on p.id = lp.profile_id
    join public.leader_details d on d.profile_id = p.id
   where lp.is_public
     and p.role in ('leader', 'stage_leader', 'stage_admin', 'site_admin', 'head_site_admin')
     and p.full_name is not null;
$$;

revoke all on function public.public_leaders() from public;
grant execute on function public.public_leaders() to anon, authenticated, service_role;

-- ------------------------------------------- 3. the stage leader seat's powers
-- Does the signed-in leader hold this stage's "Stage leader" seat (and still
-- serve the stage)?
create or replace function public.is_stage_leader_of(p_stage smallint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_staff()
     and exists (
           select 1 from public.stage_titles t
            where t.stage_id = p_stage
              and t.title = 'leader'
              and t.profile_id = (select auth.uid())
              and public.serves_stage(t.profile_id, p_stage)
         );
$$;

revoke all on function public.is_stage_leader_of(smallint) from public;
grant execute on function public.is_stage_leader_of(smallint) to authenticated, service_role;

create or replace function public.can_edit_stage_tools(p_stage smallint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_site_admin()
      or public.is_stage_leader_of(p_stage)
      or exists (
           select 1 from public.profiles p
            where p.id = (select auth.uid())
              and p.role = 'stage_admin'
              and p.admin_stage_id = p_stage
         );
$$;

create or replace function public.can_edit_request_list(p_kind text, p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_kind = 'committee' then
      public.is_site_admin() or public.is_committee_member(p_key)
    when p_kind = 'event' and p_key = 'general' then
      public.is_staff()
    when p_kind = 'event' then
      public.is_site_admin()
      or exists (
        select 1 from public.profiles p
          join public.stages s on s.id = p.admin_stage_id
         where p.id = (select auth.uid())
           and p.role = 'stage_admin'
           and s.code = p_key
      )
      or exists (
        select 1 from public.stages s
         where s.code = p_key
           and public.is_stage_leader_of(s.id)
      )
    else false
  end;
$$;

create or replace function public.can_review_scouts(p_stage smallint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_head_site_admin()
      or public.is_stage_leader_of(p_stage)
      or exists (
           select 1 from public.profiles p
            where p.id = (select auth.uid())
              and p.role = 'stage_admin'
              and p.admin_stage_id = p_stage
         );
$$;

notify pgrst, 'reload schema';

-- Who is head site admin now (shown in the SQL editor's results):
select p.full_name, u.email, p.role, p.is_site_owner
  from public.profiles p
  join auth.users u on u.id = p.id
 where p.role = 'head_site_admin'
 order by p.is_site_owner desc, p.full_name;
