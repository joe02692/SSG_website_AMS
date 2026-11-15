-- ============================================================================
-- 0029 — Notes and "where it comes from" on every request paper, and
--        approval for new scouts (Zyad, 15 Nov 2026)
--
--  1. Every item on every paper (weekly stage tools 0026, committee and event
--     papers 0028) gets:
--       • notes   free text, written by whoever may edit that paper's items,
--                 while the paper is open (the existing policies decide).
--       • source  'store' (مخزن) / 'hall' (قاعة) / 'purchase' (مشتريات).
--                 Set ONLY by the Tools & logistics committee and the head
--                 site admin — and at any time, even after the paper has
--                 closed, because that is when logistics prepare the tools.
--                 Changed only through set_item_source(); a direct update
--                 that touches it is refused.
--
--  2. Scouts who sign themselves up now wait for approval after filling in
--     their registration: scout_details.review_status = 'pending'. The head
--     site admin approves any scout; a stage admin approves scouts who chose
--     his stage. Existing scouts and children added by a parent are approved.
--     A rejected scout who edits his registration goes back to 'pending', and
--     so does an approved scout who moves to another stage.
--
--  3. events: the public read policy no longer calls is_head_site_admin()
--     for visitors (0027 took that function away from anon).
--
-- Safe to run more than once.
-- ============================================================================

-- --------------------------------------------------------- 1. item columns --
alter table public.stage_tools
  add column if not exists notes text,
  add column if not exists source text,
  add column if not exists source_by uuid references public.profiles (id) on delete set null,
  add column if not exists source_at timestamptz;

alter table public.request_items
  add column if not exists notes text,
  add column if not exists source text,
  add column if not exists source_by uuid references public.profiles (id) on delete set null,
  add column if not exists source_at timestamptz;

alter table public.stage_tools drop constraint if exists stage_tools_notes_length;
alter table public.stage_tools add constraint stage_tools_notes_length
  check (notes is null or length(notes) <= 200);
alter table public.stage_tools drop constraint if exists stage_tools_source_values;
alter table public.stage_tools add constraint stage_tools_source_values
  check (source is null or source in ('store', 'hall', 'purchase'));

alter table public.request_items drop constraint if exists request_items_notes_length;
alter table public.request_items add constraint request_items_notes_length
  check (notes is null or length(notes) <= 200);
alter table public.request_items drop constraint if exists request_items_source_values;
alter table public.request_items add constraint request_items_source_values
  check (source is null or source in ('store', 'hall', 'purchase'));

-- May the signed-in member set where items come from?
create or replace function public.can_set_item_source()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_head_site_admin() or public.is_committee_member('logistics');
$$;

-- The source columns move only inside set_item_source(), which raises this
-- transaction-local flag first. Server-side code (service role) is free.
create or replace function public.protect_item_source()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_client_connection()
     and coalesce(current_setting('app.setting_item_source', true), '') <> 'on'
     and (
       (tg_op = 'INSERT' and (new.source is not null or new.source_by is not null or new.source_at is not null))
       or (tg_op = 'UPDATE' and (
             new.source    is distinct from old.source
          or new.source_by is distinct from old.source_by
          or new.source_at is distinct from old.source_at))
     ) then
    raise exception 'only the logistics committee sets where an item comes from'
      using errcode = 'insufficient_privilege', hint = 'SOURCE_LOCKED';
  end if;
  return new;
end;
$$;

drop trigger if exists stage_tools_protect_source on public.stage_tools;
create trigger stage_tools_protect_source
  before insert or update on public.stage_tools
  for each row execute function public.protect_item_source();

drop trigger if exists request_items_protect_source on public.request_items;
create trigger request_items_protect_source
  before insert or update on public.request_items
  for each row execute function public.protect_item_source();

-- Set (or clear, with null) where one item comes from. Any time.
-- p_list: 'stage_tools' or 'request_items'. Hints: NOT_ALLOWED, BAD_VALUE,
-- NOT_FOUND.
create or replace function public.set_item_source(p_list text, p_id uuid, p_source text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if not public.can_set_item_source() then
    raise exception 'not allowed' using errcode = 'P0001', hint = 'NOT_ALLOWED';
  end if;
  if p_source is not null and p_source not in ('store', 'hall', 'purchase') then
    raise exception 'bad value' using errcode = 'P0001', hint = 'BAD_VALUE';
  end if;
  perform set_config('app.setting_item_source', 'on', true);
  if p_list = 'stage_tools' then
    update public.stage_tools
       set source = p_source,
           source_by = case when p_source is null then null else (select auth.uid()) end,
           source_at = case when p_source is null then null else now() end
     where id = p_id;
  elsif p_list = 'request_items' then
    update public.request_items
       set source = p_source,
           source_by = case when p_source is null then null else (select auth.uid()) end,
           source_at = case when p_source is null then null else now() end
     where id = p_id;
  else
    raise exception 'bad list' using errcode = 'P0001', hint = 'BAD_VALUE';
  end if;
  get diagnostics n = row_count;
  perform set_config('app.setting_item_source', 'off', true);
  if n = 0 then
    raise exception 'no such item' using errcode = 'P0001', hint = 'NOT_FOUND';
  end if;
end;
$$;

revoke all on function public.set_item_source(text, uuid, text) from public;
revoke all on function public.can_set_item_source() from public;
grant execute on function public.set_item_source(text, uuid, text) to authenticated;
grant execute on function public.can_set_item_source() to authenticated, service_role;

-- "Copy last week" now brings the notes too (never the source: logistics
-- decide that afresh each week).
create or replace function public.copy_last_week_tools(p_stage smallint)
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
  if not public.can_edit_stage_tools(p_stage) then
    raise exception 'not allowed' using errcode = 'P0001', hint = 'NOT_ALLOWED';
  end if;
  if not public.stage_tools_open() then
    raise exception 'closed' using errcode = 'P0001', hint = 'CLOSED';
  end if;
  if exists (select 1 from public.stage_tools t where t.stage_id = p_stage and t.week_start = this_week) then
    raise exception 'this week already has items' using errcode = 'P0001', hint = 'NOT_EMPTY';
  end if;
  select max(t.week_start) into from_week
    from public.stage_tools t
   where t.stage_id = p_stage and t.week_start < this_week;
  if from_week is null then
    return 0;
  end if;
  insert into public.stage_tools (stage_id, week_start, name, quantity, notes, position, created_by, updated_by)
  select t.stage_id, this_week, t.name, t.quantity, t.notes, t.position, (select auth.uid()), (select auth.uid())
    from public.stage_tools t
   where t.stage_id = p_stage and t.week_start = from_week;
  get diagnostics copied = row_count;
  return copied;
end;
$$;

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
  insert into public.request_items (kind, list_key, week_start, name, quantity, notes, position, created_by, updated_by)
  select 'committee', p_committee, this_week, r.name, r.quantity, r.notes, r.position, (select auth.uid()), (select auth.uid())
    from public.request_items r
   where r.kind = 'committee' and r.list_key = p_committee and r.week_start = from_week;
  get diagnostics copied = row_count;
  return copied;
end;
$$;

revoke all on function public.copy_last_week_tools(smallint) from public, anon;
revoke all on function public.copy_last_week_committee(text) from public, anon;
grant execute on function public.copy_last_week_tools(smallint) to authenticated;
grant execute on function public.copy_last_week_committee(text) to authenticated;

-- ------------------------------------------------------ 2. scout approval --
alter table public.scout_details
  add column if not exists review_status text not null default 'approved',
  add column if not exists reviewed_by uuid references public.profiles (id) on delete set null,
  add column if not exists reviewed_at timestamptz;

alter table public.scout_details drop constraint if exists scout_details_review_status_values;
alter table public.scout_details add constraint scout_details_review_status_values
  check (review_status in ('pending', 'approved', 'rejected'));

create index if not exists scout_details_pending_idx
  on public.scout_details (stage_id)
  where review_status = 'pending';

comment on column public.scout_details.review_status is
  'pending until the head site admin or the stage''s admin approves (0029). Scouts who signed themselves up start pending; children added by a parent, and rows from before 0029, are approved.';

-- Decides the review fields on every client write; review_scout() is the
-- only way to approve or reject.
create or replace function public.scout_review_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.reviewing_scout', true), '') = 'on'
     or not public.is_client_connection() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- A scout's own registration waits; a child added by a parent doesn't.
    new.review_status := case when new.profile_id is not null then 'pending' else 'approved' end;
    new.reviewed_by := null;
    new.reviewed_at := null;
    return new;
  end if;

  -- UPDATE from a client: the review fields can't be set by hand…
  new.reviewed_by := old.reviewed_by;
  new.reviewed_at := old.reviewed_at;
  new.review_status := old.review_status;
  -- …but a rejected scout who edits his registration asks again, and a scout
  -- who moves to another stage needs that stage's approval.
  if new.profile_id is not null and (
       old.review_status = 'rejected'
       or new.stage_id is distinct from old.stage_id
     ) then
    new.review_status := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists scout_details_review_rules on public.scout_details;
create trigger scout_details_review_rules
  before insert or update on public.scout_details
  for each row execute function public.scout_review_rules();

-- May the signed-in member review scouts of this stage?
create or replace function public.can_review_scouts(p_stage smallint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_head_site_admin()
      or exists (
           select 1 from public.profiles p
            where p.id = (select auth.uid())
              and p.role = 'stage_admin'
              and p.admin_stage_id = p_stage
         );
$$;

-- Approve or reject one scout (scout_details.id). Hints: NOT_ALLOWED,
-- BAD_VALUE, NOT_FOUND.
create or replace function public.review_scout(p_scout uuid, p_decision text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  stage smallint;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'bad decision' using errcode = 'P0001', hint = 'BAD_VALUE';
  end if;
  select s.stage_id into stage from public.scout_details s where s.id = p_scout;
  if stage is null then
    raise exception 'no such scout' using errcode = 'P0001', hint = 'NOT_FOUND';
  end if;
  if not public.can_review_scouts(stage) then
    raise exception 'not allowed' using errcode = 'P0001', hint = 'NOT_ALLOWED';
  end if;
  perform set_config('app.reviewing_scout', 'on', true);
  update public.scout_details
     set review_status = p_decision,
         reviewed_by = (select auth.uid()),
         reviewed_at = now()
   where id = p_scout;
  perform set_config('app.reviewing_scout', 'off', true);
end;
$$;

-- The scouts a reviewer can see: pending ones first, then the latest
-- decisions. Only what a decision needs — no national ID, no document path
-- (has_document says whether a certificate was uploaded).
create or replace function public.scout_requests()
returns table (
  id            uuid,
  full_name     text,
  stage_code    text,
  age           integer,
  address       text,
  personal_phone text,
  parent_phone  text,
  has_document  boolean,
  review_status text,
  submitted_at  timestamptz,
  reviewed_at   timestamptz,
  reviewer      text
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id,
         p.full_name,
         st.code,
         public.age_years(s.date_of_birth)::integer,
         s.address,
         s.personal_phone::text,
         s.parent_phone::text,
         s.document_path is not null,
         s.review_status,
         s.created_at,
         s.reviewed_at,
         r.full_name
    from public.scout_details s
    join public.profiles p on p.id = s.profile_id
    join public.stages st on st.id = s.stage_id
    left join public.profiles r on r.id = s.reviewed_by
   where s.profile_id is not null
     and public.can_review_scouts(s.stage_id)
     and (s.review_status = 'pending' or s.reviewed_at > now() - interval '30 days')
   order by (s.review_status = 'pending') desc, coalesce(s.reviewed_at, s.created_at) desc
   limit 300;
$$;

revoke all on function public.review_scout(uuid, text) from public;
revoke all on function public.scout_requests() from public;
revoke all on function public.can_review_scouts(smallint) from public;
grant execute on function public.review_scout(uuid, text) to authenticated;
grant execute on function public.scout_requests() to authenticated;
grant execute on function public.can_review_scouts(smallint) to authenticated, service_role;

-- --------------------------------------------- 3. events read for visitors --
drop policy if exists "events: everyone reads published" on public.events;
create policy "events: everyone reads published"
  on public.events for select
  to anon, authenticated
  using (published);

drop policy if exists "events: head admin reads drafts" on public.events;
create policy "events: head admin reads drafts"
  on public.events for select
  to authenticated
  using (public.is_head_site_admin());

notify pgrst, 'reload schema';
