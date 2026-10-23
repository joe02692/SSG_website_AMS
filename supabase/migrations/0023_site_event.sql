-- ============================================================================
-- 0023 — The event countdown shown on the public site.
--
-- WHY
--
-- The floating "event coming soon" countdown used to be hard-coded (title,
-- text and date in components/event-coming-soon.tsx). The head site admin now
-- controls it from the Admin page: on/off, title and description in Arabic and
-- English, and the date and time the event starts.
--
-- ONE ROW
--
-- There is only ever one countdown, so the table holds exactly one row
-- (id = 1, enforced by a CHECK). The app never inserts or deletes; it only
-- reads and updates that row.
--
-- WHO CAN DO WHAT
--
--   • Read  — everyone, signed in or not (the countdown is public).
--   • Update — the head site admin only (public.is_head_site_admin(), 0007).
--   • Insert / delete — nobody from the app. No grants, no policies.
--
-- GRANT and RLS are two separate gates and both must open (see the notes on
-- 0015 and 0018), so the grants below are as deliberate as the policies.
--
-- Safe to run more than once.
-- ============================================================================

create table if not exists public.site_event (
  id             smallint primary key default 1 check (id = 1),
  enabled        boolean     not null default false,
  title_ar       text        not null default '' check (char_length(title_ar) <= 80),
  title_en       text        not null default '' check (char_length(title_en) <= 80),
  description_ar text        not null default '' check (char_length(description_ar) <= 200),
  description_en text        not null default '' check (char_length(description_en) <= 200),
  starts_at      timestamptz,
  updated_at     timestamptz not null default now(),
  updated_by     uuid references auth.users (id) on delete set null
);

comment on table public.site_event is
  'The single public event countdown (one row, id = 1). Edited by the head site admin from /admin.';

-- The one row. Starts switched off, so nothing appears until it is set up.
insert into public.site_event (id) values (1)
on conflict (id) do nothing;

alter table public.site_event enable row level security;

drop policy if exists "site_event: anyone can read" on public.site_event;
create policy "site_event: anyone can read"
  on public.site_event
  for select
  to anon, authenticated
  using (true);

drop policy if exists "site_event: head site admin can update" on public.site_event;
create policy "site_event: head site admin can update"
  on public.site_event
  for update
  to authenticated
  using (public.is_head_site_admin())
  with check (public.is_head_site_admin());

-- Grants: read for everyone; update for signed-in members (the policy above
-- narrows that to the head site admin). No insert, no delete.
revoke all on public.site_event from anon, authenticated;
grant select on public.site_event to anon, authenticated;
grant update (enabled, title_ar, title_en, description_ar, description_en, starts_at, updated_at, updated_by)
  on public.site_event to authenticated;
grant select, update on public.site_event to service_role;

notify pgrst, 'reload schema';
