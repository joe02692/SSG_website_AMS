-- ============================================================================
-- Repair: grant table privileges on the leader tables.
--
-- 0014 created leader_details and leader_committees with full RLS policies and
-- then forgot to GRANT anything to `authenticated`. Those are two independent
-- gates and both must open:
--
--   GRANT  — may this ROLE touch this table at all?
--   POLICY — may this ROW be seen or written by this user?
--
-- Postgres checks the grant first, so with no grant it refuses before any
-- policy is evaluated. Both failures raise 42501, which is why the app's error
-- said "row-level security" when the policies were in fact perfect and the
-- privilege was the thing missing.
--
-- Symptom: every leader finishing registration got
--   "The database refused this write for your account."
-- while scouts were unaffected — 0010 granted scout_details properly.
--
-- Safe to run more than once: GRANT is idempotent, and the policies are
-- dropped and recreated so a partially-applied 0014 (the SQL editor does not
-- wrap a script in one transaction, so it can stop halfway) ends up correct
-- either way.
-- ============================================================================

grant usage on schema public to authenticated;
grant select, insert, update on public.leader_details to authenticated;
grant select, insert, update, delete on public.leader_committees to authenticated;
grant select on public.leader_details_with_age to authenticated;

-- Re-assert the policies. If 0014 applied cleanly these are byte-identical
-- replacements; if it stopped partway, this completes it.
alter table public.leader_details enable row level security;
alter table public.leader_committees enable row level security;

drop policy if exists "leader_details: read own" on public.leader_details;
create policy "leader_details: read own"
  on public.leader_details for select
  to authenticated
  using ((select auth.uid()) = profile_id);

drop policy if exists "leader_details: insert own" on public.leader_details;
create policy "leader_details: insert own"
  on public.leader_details for insert
  to authenticated
  with check ((select auth.uid()) = profile_id);

drop policy if exists "leader_details: update own" on public.leader_details;
create policy "leader_details: update own"
  on public.leader_details for update
  to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

drop policy if exists "leader_details: site admins read all" on public.leader_details;
create policy "leader_details: site admins read all"
  on public.leader_details for select
  to authenticated
  using (public.is_site_admin());

drop policy if exists "leader_committees: read own" on public.leader_committees;
create policy "leader_committees: read own"
  on public.leader_committees for select
  to authenticated
  using ((select auth.uid()) = profile_id);

drop policy if exists "leader_committees: write own" on public.leader_committees;
create policy "leader_committees: write own"
  on public.leader_committees for all
  to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

drop policy if exists "leader_committees: site admins read all" on public.leader_committees;
create policy "leader_committees: site admins read all"
  on public.leader_committees for select
  to authenticated
  using (public.is_site_admin());

notify pgrst, 'reload schema';

-- Verify. Both should come back non-empty; the grants list is the half that
-- was missing.
select grantee, privilege_type
  from information_schema.role_table_grants
 where table_schema = 'public'
   and table_name in ('leader_details', 'leader_committees')
   and grantee = 'authenticated'
 order by table_name, privilege_type;
