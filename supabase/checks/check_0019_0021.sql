-- Read-only check: have migrations 0019, 0020 and 0021 been run?
-- Paste into Supabase → SQL Editor → Run. Changes nothing.
-- Every row should say "applied". Anything "MISSING" → run that migration.

with col as (
  select table_name, column_name
  from information_schema.columns
  where table_schema = 'public'
)
select migration,
       case when ok then 'applied' else 'MISSING' end as status,
       detail
from (
  select 1 as n,
         '0019_rate_limits' as migration,
         to_regclass('public.rate_limit_hits') is not null
           and to_regprocedure('public.rate_limit_hit(text, integer, integer)') is not null as ok,
         'table rate_limit_hits + function rate_limit_hit()' as detail
  union all
  select 2,
         '0020_leader_committees_and_join_year',
         exists (select 1 from col where table_name = 'leader_details' and column_name = 'committees')
           and exists (select 1 from col where table_name = 'leader_details' and column_name = 'join_year')
           and not exists (select 1 from col where table_name = 'leader_details' and column_name = 'join_date')
           and exists (select 1 from col where table_name = 'leader_details_with_age' and column_name = 'years_in_scouting'),
         'leader_details.committees + join_year (join_date removed)'
  union all
  select 3,
         '0021_leader_gender',
         exists (select 1 from col where table_name = 'leader_details' and column_name = 'gender')
           and exists (select 1 from col where table_name = 'leader_details_with_age' and column_name = 'gender'),
         'leader_details.gender (and in leader_details_with_age)'
) checks
order by n;
