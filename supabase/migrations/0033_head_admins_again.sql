-- ============================================================================
-- 0033 — Make sure Fatema and Ahmed Badr really are head site admins
--        (23 Nov 2026)
--
-- They reported they can see the Events section but not edit it. The site
-- gives every head site admin the same powers (Events, Stages & leaders,
-- Admin…), so the likely cause is that 0032 ran before one of them had an
-- account, and their role was never changed.
--
-- This file does the promotion again (safe to run any number of times) and
-- then shows, for both addresses, the account and the role it has now.
-- If a line says "no account with this email", that person has to sign up
-- with exactly that address first; then run this file again.
-- ============================================================================

update public.profiles p
   set role = 'head_site_admin',
       admin_stage_id = null
  from auth.users u
 where u.id = p.id
   and lower(u.email) in ('fatema.m.r.zaki.07@gmail.com', 'amhbadr2006@gmail.com')
   and p.role is distinct from 'head_site_admin';

select wanted.email,
       coalesce(p.full_name, '—')                      as name,
       coalesce(p.role::text, 'no account with this email') as role_now,
       u.email_confirmed_at is not null                as email_confirmed
  from (values ('fatema.m.r.zaki.07@gmail.com'), ('amhbadr2006@gmail.com')) as wanted(email)
  left join auth.users u on lower(u.email) = wanted.email
  left join public.profiles p on p.id = u.id
 order by wanted.email;
