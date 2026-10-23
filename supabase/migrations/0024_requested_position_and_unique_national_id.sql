-- ============================================================================
-- 0024 — What a leader asks to be, stage admin seats, and one national ID per
--        person across the whole site.
--
-- 1. REQUESTED POSITION
--    At signup a leader now picks the role they would like: Stage Leader,
--    Stage Admin or Site Admin. It is stored in profiles.requested_position
--    as a WISH only — the account is still pending_leader, which grants
--    nothing, and the head site admin chooses the real role on approval.
--    handle_new_user() is rewritten from 0017 to copy the wish across; it
--    still can only ever write scout, parent or pending_leader as the role.
--
-- 2. STAGE ADMIN SEATS
--    Each stage has two stage admin seats. The signup page shows how many are
--    taken (0/2, 1/2) and hides "Stage Admin" once a stage is full. Visitors
--    are not signed in and cannot read profiles, so public.stage_admin_seats()
--    returns just the counts per stage — no names, no ids.
--
-- 3. ONE NATIONAL ID PER PERSON
--    scout_details.national_id and leader_details.national_id were each
--    unique within their own table (0010, 0014), but the same number could
--    still appear once as a scout and once as a leader. A trigger on both
--    tables now refuses that (error 23505, the same code a unique index
--    gives, so the app's "already registered" message covers it). The same
--    person (same profile_id) may appear in both — a scout who became a
--    leader keeps their old scout row.
--    public.national_id_taken() lets the registration form say "already
--    registered" BEFORE anything is uploaded.
--
-- Safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Requested position
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists requested_position text;

alter table public.profiles
  drop constraint if exists profiles_requested_position_check;
alter table public.profiles
  add constraint profiles_requested_position_check
  check (requested_position is null
         or requested_position in ('stage_leader', 'stage_admin', 'site_admin'));

comment on column public.profiles.requested_position is
  'The role a leader asked for at signup (a wish). The head site admin decides the real role on approval.';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested  text;
  stage_code text;
  wish       text;
  stage_id   smallint;
  final_role public.user_role;
  is_request boolean := false;
begin
  requested  := nullif(trim(new.raw_user_meta_data ->> 'requested_role'), '');
  stage_code := nullif(trim(new.raw_user_meta_data ->> 'requested_stage'), '');
  wish       := nullif(trim(new.raw_user_meta_data ->> 'requested_position'), '');

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

  -- Only the three positions a leader may ask for; anything else is dropped.
  if wish is not null
     and wish not in ('stage_leader', 'stage_admin', 'site_admin') then
    wish := null;
  end if;

  if stage_code is not null then
    select s.id into stage_id from public.stages s where s.code = stage_code;
  end if;

  insert into public.profiles (id, full_name, role, requested_stage_id, requested_at, requested_position)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    final_role,
    case when is_request then stage_id else null end,
    case when is_request then now() else null end,
    case when is_request then wish else null end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates the profile on signup. Can only ever assign scout, parent or pending_leader — never a role that grants access. requested_position is recorded as a wish. Approval is a separate, authenticated act.';

-- ---------------------------------------------------------------------------
-- 2. Stage admin seats (counts only)
-- ---------------------------------------------------------------------------
create or replace function public.stage_admin_seats()
returns table (stage_code text, taken integer)
language sql
stable
security definer
set search_path = ''
as $$
  select s.code, count(p.id)::integer
    from public.stages s
    left join public.profiles p
      on p.admin_stage_id = s.id
     and p.role = 'stage_admin'
   group by s.code;
$$;

comment on function public.stage_admin_seats() is
  'How many stage admins each stage has (approved only). Counts, no names — safe for the public signup page.';

revoke all on function public.stage_admin_seats() from public;
grant execute on function public.stage_admin_seats() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. One national ID per person, across scouts and leaders
-- ---------------------------------------------------------------------------
create or replace function public.national_id_taken(p_national_id text)
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
         )
      or exists (
           select 1 from public.leader_details d
            where d.national_id = p_national_id
              and d.profile_id is distinct from (select auth.uid())
         );
$$;

comment on function public.national_id_taken(text) is
  'True when another member already registered this national ID. Lets the form refuse a duplicate before the document is uploaded.';

revoke all on function public.national_id_taken(text) from public;
grant execute on function public.national_id_taken(text) to authenticated, service_role;

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
    if exists (
      select 1 from public.leader_details l
       where l.national_id = new.national_id
         and l.profile_id <> new.profile_id
    ) then
      raise exception 'national_id % is already registered', new.national_id
        using errcode = 'unique_violation';
    end if;
  else
    if exists (
      select 1 from public.scout_details s
       where s.national_id = new.national_id
         and s.profile_id <> new.profile_id
    ) then
      raise exception 'national_id % is already registered', new.national_id
        using errcode = 'unique_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists scout_details_unique_national_id on public.scout_details;
create trigger scout_details_unique_national_id
  before insert or update of national_id on public.scout_details
  for each row execute function public.enforce_unique_national_id();

drop trigger if exists leader_details_unique_national_id on public.leader_details;
create trigger leader_details_unique_national_id
  before insert or update of national_id on public.leader_details
  for each row execute function public.enforce_unique_national_id();

-- Existing data: report (don't fail on) any number already used by two
-- different people, one as a scout and one as a leader. Fix those by hand.
do $$
declare
  clashes integer;
begin
  select count(*) into clashes
    from public.scout_details s
    join public.leader_details l
      on l.national_id = s.national_id
     and l.profile_id <> s.profile_id;
  if clashes > 0 then
    raise notice '% national ID(s) are already used by a scout and a different leader. Find them with: select s.national_id, s.profile_id as scout, l.profile_id as leader from scout_details s join leader_details l on l.national_id = s.national_id and l.profile_id <> s.profile_id;', clashes;
  end if;
end;
$$;

notify pgrst, 'reload schema';
