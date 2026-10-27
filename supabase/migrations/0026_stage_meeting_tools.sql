-- ============================================================================
-- 0026 — "أدوات كل اجتماع": the tools and items each stage needs at its
--        meetings, one list per stage per week.
--
-- RULES (Zyad, Oct 2026)
--   • Every leader can see every stage's list (Seasonal Plan page).
--   • Only that stage's stage admins (and the head site admin) can add,
--     remove, change the number of, or reorder items.
--   • Editing is open Saturday 12:01 am → Wednesday 11:59 pm, Cairo time.
--     Thursday and Friday the lists are read-only for everyone.
--   • Every Saturday the lists start fresh. Nothing is deleted: each week is
--     its own list (week_start = that week's Saturday), and a stage admin can
--     copy last week's items in with one press.
--
-- The time window is enforced HERE, not only in the app: the write policies
-- call public.stage_tools_open(), so a crafted request on a Thursday is
-- refused by the database too.
--
-- Safe to run more than once.
-- ============================================================================

-- Cairo's current date and weekday. EXTRACT(dow): Sunday 0 … Saturday 6.
create or replace function public.cairo_now()
returns timestamp
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Africa/Cairo');
$$;

-- The Saturday that starts the current week (Cairo).
create or replace function public.current_tools_week()
returns date
language sql
stable
set search_path = ''
as $$
  select (public.cairo_now())::date
         - ((extract(dow from public.cairo_now())::int + 1) % 7);
$$;

-- Open Saturday → Wednesday (Cairo). Closed Thursday and Friday.
create or replace function public.stage_tools_open()
returns boolean
language sql
stable
set search_path = ''
as $$
  select extract(dow from public.cairo_now())::int in (6, 0, 1, 2, 3);
$$;

-- May the signed-in member change this stage's list (ignoring the time)?
-- The head site admin: any stage. A stage admin: the stage you assigned them.
create or replace function public.can_edit_stage_tools(p_stage smallint)
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

create table if not exists public.stage_tools (
  id         uuid        primary key default gen_random_uuid(),
  stage_id   smallint    not null references public.stages (id) on delete cascade,
  week_start date        not null,
  name       text        not null check (length(btrim(name)) between 1 and 80),
  quantity   smallint    check (quantity is null or quantity between 1 and 999),
  position   integer     not null default 0,
  created_by uuid        references public.profiles (id) on delete set null,
  updated_by uuid        references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.stage_tools is
  'Items/tools a stage needs at its meetings, one list per stage per week (week_start = the Saturday). Edited Sat–Wed by that stage''s stage admins.';

create index if not exists stage_tools_week_idx
  on public.stage_tools (week_start, stage_id, position);

drop trigger if exists stage_tools_touch_updated_at on public.stage_tools;
create trigger stage_tools_touch_updated_at
  before update on public.stage_tools
  for each row execute function public.touch_updated_at();

alter table public.stage_tools enable row level security;

drop policy if exists "stage_tools: leaders read" on public.stage_tools;
create policy "stage_tools: leaders read"
  on public.stage_tools for select
  to authenticated
  using (public.is_staff());

-- Writes: the right person, this week's list, inside the open days.
drop policy if exists "stage_tools: stage admins add" on public.stage_tools;
create policy "stage_tools: stage admins add"
  on public.stage_tools for insert
  to authenticated
  with check (
    public.can_edit_stage_tools(stage_id)
    and public.stage_tools_open()
    and week_start = public.current_tools_week()
  );

drop policy if exists "stage_tools: stage admins change" on public.stage_tools;
create policy "stage_tools: stage admins change"
  on public.stage_tools for update
  to authenticated
  using (
    public.can_edit_stage_tools(stage_id)
    and public.stage_tools_open()
    and week_start = public.current_tools_week()
  )
  with check (
    public.can_edit_stage_tools(stage_id)
    and public.stage_tools_open()
    and week_start = public.current_tools_week()
  );

drop policy if exists "stage_tools: stage admins remove" on public.stage_tools;
create policy "stage_tools: stage admins remove"
  on public.stage_tools for delete
  to authenticated
  using (
    public.can_edit_stage_tools(stage_id)
    and public.stage_tools_open()
    and week_start = public.current_tools_week()
  );

-- "Copy last week": brings the most recent earlier week's items into this
-- week's list, only while this week's list is still empty. Returns how many
-- items were copied.
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

  insert into public.stage_tools (stage_id, week_start, name, quantity, position, created_by, updated_by)
  select t.stage_id, this_week, t.name, t.quantity, t.position, (select auth.uid()), (select auth.uid())
    from public.stage_tools t
   where t.stage_id = p_stage and t.week_start = from_week;
  get diagnostics copied = row_count;
  return copied;
end;
$$;

revoke all on function public.copy_last_week_tools(smallint) from public;
grant execute on function public.copy_last_week_tools(smallint) to authenticated;
grant execute on function public.current_tools_week() to authenticated, service_role;
grant execute on function public.stage_tools_open() to authenticated, service_role;
grant execute on function public.can_edit_stage_tools(smallint) to authenticated, service_role;
grant execute on function public.cairo_now() to authenticated, service_role;

grant select, insert, update, delete on public.stage_tools to authenticated;
grant select, insert, update, delete on public.stage_tools to service_role;

notify pgrst, 'reload schema';
