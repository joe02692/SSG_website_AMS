-- ============================================================================
-- Adds the `pending_leader` role, on its own.
--
-- Alone in its own migration for a Postgres rule that has caught this project
-- before: a new enum value cannot be USED in the same transaction that adds
-- it. 0017 assigns this value, so the two must not run together. Migration
-- 0002 was split for exactly the same reason.
--
-- `pending_leader` is a role that grants nothing, anywhere. It is deliberately
-- absent from STAFF_ROLES, STAGE_ROLES and SITE_ADMIN_ROLES in lib/roles.ts,
-- and from is_staff(), is_site_admin() and is_head_site_admin() in SQL. Someone
-- who has asked to be a leader and not yet been approved has exactly the
-- access of a stranger, which is the whole point of the request flow.
-- ============================================================================

alter type public.user_role add value if not exists 'pending_leader';
