-- ============================================================================
-- 0028 — Events, request papers, stage info and public leader profiles
--        (Zyad, 14 Nov 2026)
--
--  1. events            Upcoming events on the public /events page. Only the
--                       head site admin adds, edits and removes them.
--  2. request_items     "Paper requests" (أوراق الطلبات): item lists, like the
--                       weekly stage tools of 0026, for two new kinds of list:
--       • committee  one paper per leader committee per week (program, media,
--                    secretary, logistics, training). Any leader IN that
--                    committee edits it; every leader sees it. Same weekly
--                    window as the stage tools: Saturday → Wednesday, Cairo.
--       • event      one paper per stage per event, plus a "general" paper.
--                    A stage's paper: that stage's stage admins (+ head
--                    admin). General: any leader. Open from 10 days before
--                    the event until 24 hours before it.
--  3. stage_info        The text in each stage's pop-up on /stages (promise,
--                       about, age group, vision, mission), Arabic + English.
--                       Everyone reads it; the head site admin edits it.
--  4. leader_profiles   A leader's public profile: photo, a free "about", and
--                       an opt-in switch. Nobody appears publicly until they
--                       switch it on.
--     stage_titles      "Stage leader" / "Assistant stage leader": one seat
--                       of each per stage, picked by the leader himself.
--
-- Time windows are enforced HERE (RLS), not only in the app.
-- Safe to run more than once.
-- ============================================================================

-- ------------------------------------------------------------------ events --
create table if not exists public.events (
  id             uuid        primary key default gen_random_uuid(),
  title_ar       text        not null check (length(btrim(title_ar)) between 1 and 120),
  title_en       text        check (title_en is null or length(title_en) <= 120),
  description_ar text        check (description_ar is null or length(description_ar) <= 2000),
  description_en text        check (description_en is null or length(description_en) <= 2000),
  location_ar    text        check (location_ar is null or length(location_ar) <= 160),
  location_en    text        check (location_en is null or length(location_en) <= 160),
  starts_at      timestamptz not null,
  ends_at        timestamptz,
  -- Backblaze key under "Public/Events/" (served by /media/...), or null.
  photo_key      text        check (photo_key is null or photo_key like 'Public/Events/%'),
  published      boolean     not null default true,
  created_by     uuid        references public.profiles (id) on delete set null,
  updated_by     uuid        references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint events_end_after_start check (ends_at is null or ends_at > starts_at)
);

comment on table public.events is
  'Upcoming events (public /events page). Head site admin only writes. Leaders'' event request papers hang off these (request_items kind = event).';

create index if not exists events_starts_idx on public.events (starts_at);

drop trigger if exists events_touch_updated_at on public.events;
create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();

alter table public.events enable row level security;

drop policy if exists "events: everyone reads published" on public.events;
create policy "events: everyone reads published"
  on public.events for select
  to anon, authenticated
  using (published or public.is_head_site_admin());

drop policy if exists "events: head admin adds" on public.events;
create policy "events: head admin adds"
  on public.events for insert
  to authenticated
  with check (public.is_head_site_admin());

drop policy if exists "events: head admin changes" on public.events;
create policy "events: head admin changes"
  on public.events for update
  to authenticated
  using (public.is_head_site_admin())
  with check (public.is_head_site_admin());

drop policy if exists "events: head admin removes" on public.events;
create policy "events: head admin removes"
  on public.events for delete
  to authenticated
  using (public.is_head_site_admin());

grant select on public.events to anon;
grant select, insert, update, delete on public.events to authenticated, service_role;

-- ------------------------------------------------------- request papers --
create table if not exists public.request_items (
  id         uuid        primary key default gen_random_uuid(),
  kind       text        not null check (kind in ('committee', 'event')),
  -- committee: the committee code. event: a stage code or 'general'.
  list_key   text        not null,
  event_id   uuid        references public.events (id) on delete cascade,
  week_start date,
  name       text        not null check (length(btrim(name)) between 1 and 80),
  quantity   smallint    check (quantity is null or quantity between 1 and 999),
  position   integer     not null default 0,
  created_by uuid        references public.profiles (id) on delete set null,
  updated_by uuid        references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint request_items_shape check (
    (kind = 'committee'
      and week_start is not null and event_id is null
      and list_key in ('program', 'media', 'secretary', 'logistics', 'training'))
    or
    (kind = 'event'
      and event_id is not null and week_start is null)
  )
);

comment on table public.request_items is
  'Paper requests: committee papers (weekly, Sat–Wed) and event papers (per stage + general, open 10 days → 24 h before the event).';

create index if not exists request_items_committee_idx
  on public.request_items (kind, week_start, list_key, position);
create index if not exists request_items_event_idx
  on public.request_items (event_id, list_key, position);

drop trigger if exists request_items_touch_updated_at on public.request_items;
create trigger request_items_touch_updated_at
  before update on public.request_items
  for each row execute function public.touch_updated_at();

-- An event paper's list_key must be a real stage code or 'general'.
create or replace function public.check_request_item_key()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind = 'event' and new.list_key <> 'general'
     and not exists (select 1 from public.stages s where s.code = new.list_key) then
    raise exception 'unknown paper %', new.list_key using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists request_items_check_key on public.request_items;
create trigger request_items_check_key
  before insert or update on public.request_items
  for each row execute function public.check_request_item_key();

-- Is the signed-in leader a member of this committee?
create or replace function public.is_committee_member(p_committee text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_staff() and exists (
    select 1 from public.leader_details d
     where d.profile_id = (select auth.uid())
       and p_committee = any (d.committees)
  );
$$;

-- May the signed-in member change this paper (ignoring the time)?
create or replace function public.can_edit_request_list(p_kind text, p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_kind = 'committee' then
      public.is_head_site_admin() or public.is_committee_member(p_key)
    when p_kind = 'event' and p_key = 'general' then
      public.is_staff()
    when p_kind = 'event' then
      public.is_head_site_admin() or exists (
        select 1 from public.profiles p
          join public.stages s on s.id = p.admin_stage_id
         where p.id = (select auth.uid())
           and p.role = 'stage_admin'
           and s.code = p_key
      )
    else false
  end;
$$;

-- Is this event's request window open: 10 days before → 24 hours before?
create or replace function public.event_requests_open(p_event uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.events e
     where e.id = p_event
       and e.published
       and now() >= e.starts_at - interval '10 days'
       and now() <  e.starts_at - interval '24 hours'
  );
$$;

-- Is this paper open for changes right now?
create or replace function public.request_list_open(p_kind text, p_event uuid, p_week date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_kind = 'committee' then
      public.stage_tools_open() and p_week = public.current_tools_week()
    when p_kind = 'event' then
      public.event_requests_open(p_event)
    else false
  end;
$$;

alter table public.request_items enable row level security;

drop policy if exists "request_items: leaders read" on public.request_items;
create policy "request_items: leaders read"
  on public.request_items for select
  to authenticated
  using (public.is_staff());

drop policy if exists "request_items: editors add" on public.request_items;
create policy "request_items: editors add"
  on public.request_items for insert
  to authenticated
  with check (
    public.can_edit_request_list(kind, list_key)
    and public.request_list_open(kind, event_id, week_start)
  );

drop policy if exists "request_items: editors change" on public.request_items;
create policy "request_items: editors change"
  on public.request_items for update
  to authenticated
  using (
    public.can_edit_request_list(kind, list_key)
    and public.request_list_open(kind, event_id, week_start)
  )
  with check (
    public.can_edit_request_list(kind, list_key)
    and public.request_list_open(kind, event_id, week_start)
  );

drop policy if exists "request_items: editors remove" on public.request_items;
create policy "request_items: editors remove"
  on public.request_items for delete
  to authenticated
  using (
    public.can_edit_request_list(kind, list_key)
    and public.request_list_open(kind, event_id, week_start)
  );

-- "Copy last week" for a committee paper, like copy_last_week_tools (0026).
create or replace function public.copy_last_week_committee(p_committee text)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  this_week date := public.current_tools_week();
  from_week date;
  copied    integer;
begin
  if not public.can_edit_request_list('committee', p_committee) then
    raise exception 'not allowed' using errcode = 'P0001', hint = 'NOT_ALLOWED';
  end if;
  if not public.stage_tools_open() then
    raise exception 'closed' using errcode = 'P0001', hint = 'CLOSED';
  end if;
  if exists (select 1 from public.request_items r
              where r.kind = 'committee' and r.list_key = p_committee and r.week_start = this_week) then
    raise exception 'this week already has items' using errcode = 'P0001', hint = 'NOT_EMPTY';
  end if;

  select max(r.week_start) into from_week
    from public.request_items r
   where r.kind = 'committee' and r.list_key = p_committee and r.week_start < this_week;
  if from_week is null then
    return 0;
  end if;

  insert into public.request_items (kind, list_key, week_start, name, quantity, position, created_by, updated_by)
  select 'committee', p_committee, this_week, r.name, r.quantity, r.position, (select auth.uid()), (select auth.uid())
    from public.request_items r
   where r.kind = 'committee' and r.list_key = p_committee and r.week_start = from_week;
  get diagnostics copied = row_count;
  return copied;
end;
$$;

revoke all on function public.copy_last_week_committee(text) from public;
grant execute on function public.copy_last_week_committee(text) to authenticated;
grant execute on function public.is_committee_member(text) to authenticated, service_role;
grant execute on function public.can_edit_request_list(text, text) to authenticated, service_role;
grant execute on function public.event_requests_open(uuid) to authenticated, service_role;
grant execute on function public.request_list_open(text, uuid, date) to authenticated, service_role;

grant select, insert, update, delete on public.request_items to authenticated, service_role;

-- -------------------------------------------------------------- stage info --
create table if not exists public.stage_info (
  stage_code   text primary key references public.stages (code) on update cascade on delete cascade,
  promise_ar   text check (promise_ar   is null or length(promise_ar)   <= 1000),
  promise_en   text check (promise_en   is null or length(promise_en)   <= 1000),
  about_ar     text check (about_ar     is null or length(about_ar)     <= 2000),
  about_en     text check (about_en     is null or length(about_en)     <= 2000),
  age_group_ar text check (age_group_ar is null or length(age_group_ar) <= 120),
  age_group_en text check (age_group_en is null or length(age_group_en) <= 120),
  vision_ar    text check (vision_ar    is null or length(vision_ar)    <= 1000),
  vision_en    text check (vision_en    is null or length(vision_en)    <= 1000),
  mission_ar   text check (mission_ar   is null or length(mission_ar)   <= 1000),
  mission_en   text check (mission_en   is null or length(mission_en)   <= 1000),
  updated_by   uuid references public.profiles (id) on delete set null,
  updated_at   timestamptz not null default now()
);

comment on table public.stage_info is
  'Text in each stage''s pop-up on /stages. Public read; head site admin writes.';

drop trigger if exists stage_info_touch_updated_at on public.stage_info;
create trigger stage_info_touch_updated_at
  before update on public.stage_info
  for each row execute function public.touch_updated_at();

alter table public.stage_info enable row level security;

drop policy if exists "stage_info: everyone reads" on public.stage_info;
create policy "stage_info: everyone reads"
  on public.stage_info for select
  to anon, authenticated
  using (true);

drop policy if exists "stage_info: head admin adds" on public.stage_info;
create policy "stage_info: head admin adds"
  on public.stage_info for insert
  to authenticated
  with check (public.is_head_site_admin());

drop policy if exists "stage_info: head admin changes" on public.stage_info;
create policy "stage_info: head admin changes"
  on public.stage_info for update
  to authenticated
  using (public.is_head_site_admin())
  with check (public.is_head_site_admin());

grant select on public.stage_info to anon;
grant select, insert, update on public.stage_info to authenticated, service_role;

-- A first draft for every stage (only where nothing exists yet). The promise
-- is the group's Scout Promise; the younger stages get the cub promise. Age
-- groups are left empty on purpose — the group fills them in from /admin.
insert into public.stage_info (stage_code, promise_ar, promise_en, about_ar, about_en, vision_ar, vision_en, mission_ar, mission_en)
select s.code,
       case when s.code in ('baraem', 'zahrat', 'ashbal')
            then 'أعد أن أبذل جهدي في أن أقوم بواجبي نحو الله ثم الوطن، وأن أطيع قانون المرحلة، وأن أعمل عملًا طيبًا كل يوم.'
            else 'أعد بشرفي أن أبذل جهدي في أن أقوم بواجبي نحو الله ثم الوطن، وأن أساعد الناس.' end,
       case when s.code in ('baraem', 'zahrat', 'ashbal')
            then 'I promise to do my best to do my duty to God and then my country, to keep the law of my stage, and to do a good turn every day.'
            else 'On my honour, I promise to do my best to do my duty to God and then my country, and to help other people.' end,
       'مرحلة ' || s.name_ar || ' في مجموعة السلام الكشفية: لقاءات أسبوعية، وألعاب، ورحلات ومخيمات يتعلم فيها الأعضاء الاعتماد على النفس والعمل بروح الفريق.',
       'The ' || s.name_en || ' stage at El-Salam Scouting Group: weekly meetings, games, trips and camps where members learn to rely on themselves and to work as a team.',
       'جيل واثق من نفسه، نافع لمجتمعه، يحمل قيم الكشافة في كل مكان.',
       'A confident generation, useful to its community, carrying scouting''s values wherever it goes.',
       'نقدّم برنامجًا كشفيًا ممتعًا وآمنًا يناسب عمر كل عضو، يبني شخصيته ومهاراته خطوة بخطوة.',
       'To offer a fun, safe scouting programme suited to each member''s age, building character and skills step by step.'
  from public.stages s
on conflict (stage_code) do nothing;

-- ------------------------------------------------- leader public profiles --
create table if not exists public.leader_profiles (
  profile_id  uuid        primary key references public.profiles (id) on delete cascade,
  -- Backblaze key under "Public/Leaders/" (served by /media/...), or null.
  photo_key   text        check (photo_key is null or photo_key like 'Public/Leaders/%'),
  about       text        check (about is null or length(about) <= 800),
  is_public   boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.leader_profiles is
  'A leader''s public profile (photo, about, opt-in). Shown to visitors only when is_public. Name, age, education and join year come from profiles/leader_details.';

drop trigger if exists leader_profiles_touch_updated_at on public.leader_profiles;
create trigger leader_profiles_touch_updated_at
  before update on public.leader_profiles
  for each row execute function public.touch_updated_at();

alter table public.leader_profiles enable row level security;

drop policy if exists "leader_profiles: read own" on public.leader_profiles;
create policy "leader_profiles: read own"
  on public.leader_profiles for select
  to authenticated
  using (profile_id = (select auth.uid()) or public.is_head_site_admin());

drop policy if exists "leader_profiles: leaders add own" on public.leader_profiles;
create policy "leader_profiles: leaders add own"
  on public.leader_profiles for insert
  to authenticated
  with check (profile_id = (select auth.uid()) and public.is_staff());

drop policy if exists "leader_profiles: leaders change own" on public.leader_profiles;
create policy "leader_profiles: leaders change own"
  on public.leader_profiles for update
  to authenticated
  using (profile_id = (select auth.uid()) and public.is_staff())
  with check (profile_id = (select auth.uid()) and public.is_staff());

-- The head admin can take a profile down (e.g. an unsuitable photo).
drop policy if exists "leader_profiles: head admin changes" on public.leader_profiles;
create policy "leader_profiles: head admin changes"
  on public.leader_profiles for update
  to authenticated
  using (public.is_head_site_admin())
  with check (public.is_head_site_admin());

grant select, insert, update on public.leader_profiles to authenticated, service_role;

-- One "Stage leader" and one "Assistant stage leader" seat per stage.
create table if not exists public.stage_titles (
  stage_id   smallint    not null references public.stages (id) on delete cascade,
  title      text        not null check (title in ('leader', 'assistant')),
  profile_id uuid        not null references public.profiles (id) on delete cascade,
  claimed_at timestamptz not null default now(),
  primary key (stage_id, title),
  -- …and one seat per leader per stage.
  unique (stage_id, profile_id)
);

comment on table public.stage_titles is
  'Stage leader / assistant stage leader. One seat of each per stage (primary key). Taken and released only through claim_stage_title() / release_stage_title().';

alter table public.stage_titles enable row level security;

drop policy if exists "stage_titles: leaders read" on public.stage_titles;
create policy "stage_titles: leaders read"
  on public.stage_titles for select
  to authenticated
  using (public.is_staff());

grant select on public.stage_titles to authenticated, service_role;
-- No insert/update/delete grants: only the functions below write.

-- Does the signed-in leader serve this stage?
create or replace function public.serves_stage(p_profile uuid, p_stage smallint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.leader_committees c where c.profile_id = p_profile and c.stage_id = p_stage)
      or exists (select 1 from public.profiles p where p.id = p_profile and p.role = 'stage_admin' and p.admin_stage_id = p_stage);
$$;

-- Take a seat (or switch seat in the same stage). Hints: NOT_ALLOWED,
-- NOT_YOUR_STAGE, TAKEN.
create or replace function public.claim_stage_title(p_stage smallint, p_title text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  holder uuid;
begin
  if me is null or not public.is_staff() or p_title not in ('leader', 'assistant') then
    raise exception 'not allowed' using errcode = 'P0001', hint = 'NOT_ALLOWED';
  end if;
  if not public.serves_stage(me, p_stage) then
    raise exception 'not your stage' using errcode = 'P0001', hint = 'NOT_YOUR_STAGE';
  end if;
  -- Lock the stage's seats so two leaders can't take the same one at once.
  perform 1 from public.stages where id = p_stage for update;
  select profile_id into holder from public.stage_titles where stage_id = p_stage and title = p_title;
  if holder is not null and holder <> me then
    raise exception 'taken' using errcode = 'P0001', hint = 'TAKEN';
  end if;
  if holder = me then
    return;
  end if;
  delete from public.stage_titles where stage_id = p_stage and profile_id = me;
  insert into public.stage_titles (stage_id, title, profile_id) values (p_stage, p_title, me);
end;
$$;

-- Leave your seat in a stage. The head admin can free anyone's seat.
create or replace function public.release_stage_title(p_stage smallint, p_profile uuid default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  target uuid := coalesce(p_profile, me);
begin
  if me is null or not public.is_staff() then
    raise exception 'not allowed' using errcode = 'P0001', hint = 'NOT_ALLOWED';
  end if;
  if target <> me and not public.is_head_site_admin() then
    raise exception 'not allowed' using errcode = 'P0001', hint = 'NOT_ALLOWED';
  end if;
  delete from public.stage_titles where stage_id = p_stage and profile_id = target;
end;
$$;

revoke all on function public.claim_stage_title(smallint, text) from public;
revoke all on function public.release_stage_title(smallint, uuid) from public;
grant execute on function public.claim_stage_title(smallint, text) to authenticated;
grant execute on function public.release_stage_title(smallint, uuid) to authenticated;
grant execute on function public.serves_stage(uuid, smallint) to authenticated, service_role;

-- Everything a visitor may see about the leaders who opted in — and nothing
-- else (no phone, national ID, birth date; age only). Titles count only for
-- stages the leader still serves.
create or replace function public.public_leaders()
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
  titles      jsonb
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
         ), '[]'::jsonb)
    from public.leader_profiles lp
    join public.profiles p on p.id = lp.profile_id
    join public.leader_details d on d.profile_id = p.id
   where lp.is_public
     and p.role in ('leader', 'stage_leader', 'stage_admin', 'site_admin', 'head_site_admin')
     and p.full_name is not null;
$$;

revoke all on function public.public_leaders() from public;
grant execute on function public.public_leaders() to anon, authenticated, service_role;

-- Who holds each seat (names only), for the profile form: "taken by …".
create or replace function public.stage_title_holders()
returns table (stage_code text, title text, profile_id uuid, full_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.code, t.title, t.profile_id, p.full_name
    from public.stage_titles t
    join public.stages s on s.id = t.stage_id
    join public.profiles p on p.id = t.profile_id
   where public.is_staff();
$$;

revoke all on function public.stage_title_holders() from public;
grant execute on function public.stage_title_holders() to authenticated, service_role;

notify pgrst, 'reload schema';
