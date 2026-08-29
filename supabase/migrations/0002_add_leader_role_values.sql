-- ============================================================================
-- Adds the two new leader roles to the user_role enum.
--
-- ⚠️ RUN THIS FILE ON ITS OWN, BEFORE 0003.
-- Postgres will not let a newly added enum value be *used* in the same
-- transaction that added it. Splitting the change across two migrations is
-- the standard way around that — 0003 is what actually uses these values.
-- ============================================================================

alter type public.user_role add value if not exists 'stage_admin';
alter type public.user_role add value if not exists 'stage_leader';

-- The original 'leader' value is deliberately left in place: Postgres cannot
-- drop a single enum value, and 0003 migrates every existing row off it.
-- Nothing new is ever assigned 'leader' after that point.
