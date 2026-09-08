-- ============================================================================
-- The service role can't write to profiles. Approving a leader request fails
-- with 42501 "permission denied for table profiles".
--
-- THE BUG
--
-- Every GRANT in this repo — 0001, 0010, 0014, 0015, 0017 — targets
-- `authenticated` and nobody else. `service_role` has never been granted
-- anything, on any table.
--
-- That went unnoticed for months because until now the service-role client was
-- only ever used against the Auth Admin API: deleteUser, getUserById,
-- generateLink. Those go through GoTrue, which connects as a superuser and
-- never consults PostgREST's table grants. approveRequestAction is the first
-- code in this project to reach an actual TABLE with the service-role key, so
-- it is the first to discover the grant was never there.
--
-- Supabase normally papers over this: a fresh project has
--   alter default privileges in schema public
--     grant all on tables to postgres, anon, authenticated, service_role;
-- so tables created afterwards pick up service_role automatically. On this
-- database that did not happen for `profiles`. Which is precisely why this
-- repo's rule is to grant explicitly and never rely on an inherited default —
-- the same rule 0014 broke for `authenticated` and 0015 had to repair.
--
-- Reproduced before writing this file: on a database with no default
-- privileges, the exact statement approveRequestAction runs, executed as
-- `service_role`, fails with `ERROR: permission denied for table profiles`.
-- After this migration it succeeds.
--
-- Safe to re-run, and safe on a database that already has these grants.
-- ============================================================================

grant usage on schema public to service_role;

-- The one table the service-role client actually writes: approvals
-- (approveRequestAction) and role changes (changeRoleAction).
grant select, insert, update, delete on public.profiles to service_role;

-- The rest of the app's tables, granted now rather than one 42501 at a time.
--
-- This is not over-reach: service_role is the trusted backend identity, it
-- already bypasses RLS, and Supabase's own default for a new project is ALL on
-- every table in this schema. The only thing standing between this key and the
-- data is that it never leaves the server — it is not in the browser bundle,
-- it has no NEXT_PUBLIC_ prefix, and every action that uses it checks
-- requireHeadAdmin() first. Withholding a grant from it buys nothing and costs
-- an afternoon the next time a server action needs a table.
grant select, insert, update, delete on public.leader_details    to service_role;
grant select, insert, update, delete on public.leader_committees to service_role;
grant select, insert, update, delete on public.scout_details     to service_role;
grant select                         on public.stages            to service_role;

-- leader_invites is retired (0017) and deliberately left read-only: the table
-- is kept as the record of how the current leaders joined, and nothing should
-- be writing to it again.
grant select on public.leader_invites to service_role;

-- Sequences, so an insert through the service role can use a serial default.
grant usage, select on all sequences in schema public to service_role;

-- And for anything added later, so this file is the last time this bites.
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;

notify pgrst, 'reload schema';
