-- ============================================================================
-- Adds the two site-level roles to the user_role enum.
--
-- ⚠️ RUN THIS FILE ON ITS OWN, BEFORE 0007.
-- Postgres will not let a newly added enum value be *used* in the same
-- transaction that added it. 0007 is what uses them.
-- ============================================================================

alter type public.user_role add value if not exists 'site_admin';
alter type public.user_role add value if not exists 'head_site_admin';
