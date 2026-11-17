-- ============================================================================
-- 0031 — Feedback from the validation group (17 Nov 2026)
--
--   1. events.pinned: the head admin can pin any number of events; pinned
--      ones are listed first on /events with a "Pinned" badge.
--   2. public_leaders() also returns the leader's work committees and whether
--      they are the website owner (the head site admin), for the public
--      profile page.
--   3. Site admins edit the leaders' tools like the head admin: weekly stage
--      tools for every stage, every committee paper, every event paper, and
--      where items come from. (Seasonal plans live in Backblaze, not in the
--      database; that part is in the app.) The time windows still apply to
--      everyone, as before.
--
-- Safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------- 1. pinned
alter table public.events
  add column if not exists pinned boolean not null default false;

comment on column public.events.pinned is
  'Pinned by the head admin: listed first on /events (0031).';

-- ------------------------------------------------- 2. public leader profiles
-- The return type changes, so the old function has to go first.
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
         p.role = 'head_site_admin'
    from public.leader_profiles lp
    join public.profiles p on p.id = lp.profile_id
    join public.leader_details d on d.profile_id = p.id
   where lp.is_public
     and p.role in ('leader', 'stage_leader', 'stage_admin', 'site_admin', 'head_site_admin')
     and p.full_name is not null;
$$;

revoke all on function public.public_leaders() from public;
grant execute on function public.public_leaders() to anon, authenticated, service_role;

-- ------------------------------------------- 3. site admins edit like head
-- is_site_admin() is true for site_admin AND head_site_admin (0007).

create or replace function public.can_edit_stage_tools(p_stage smallint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_site_admin()
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
      public.is_site_admin() or exists (
        select 1 from public.profiles p
          join public.stages s on s.id = p.admin_stage_id
         where p.id = (select auth.uid())
           and p.role = 'stage_admin'
           and s.code = p_key
      )
    else false
  end;
$$;

create or replace function public.can_set_item_source()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_site_admin() or public.is_committee_member('logistics');
$$;

notify pgrst, 'reload schema';
