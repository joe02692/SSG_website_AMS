-- ============================================================================
-- 0030 — A stage leader / assistant seat frees itself when its holder no
--        longer serves that stage (16 Nov 2026, from the code audit)
--
-- Before: if Ahmed held Cubs' "Stage leader" and then moved to another stage
-- (or stopped being a leader), the seat still read "taken by Ahmed" and
-- nobody could pick it until the head admin pressed "Free seat".
--
-- Now a holder who no longer serves the stage doesn't count: the seat shows
-- as free, and the next leader who picks it replaces the old row.
-- (public_leaders() already ignored such titles.)
--
-- Safe to run more than once.
-- ============================================================================

create or replace function public.claim_stage_title(p_stage smallint, p_title text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  holder uuid;
begin
  if me is null or not public.is_staff() or p_title not in ('leader', 'assistant') then
    raise exception 'not allowed' using errcode = 'P0001', hint = 'NOT_ALLOWED';
  end if;
  if not public.serves_stage(me, p_stage) then
    raise exception 'not your stage' using errcode = 'P0001', hint = 'NOT_YOUR_STAGE';
  end if;
  -- Lock the stage's seats so two leaders can't take the same one at once.
  perform 1 from public.stages where id = p_stage for update;
  -- Seats whose holder left this stage are free again.
  delete from public.stage_titles t
   where t.stage_id = p_stage
     and not public.serves_stage(t.profile_id, p_stage);
  select profile_id into holder from public.stage_titles where stage_id = p_stage and title = p_title;
  if holder is not null and holder <> me then
    raise exception 'taken' using errcode = 'P0001', hint = 'TAKEN';
  end if;
  if holder = me then
    return;
  end if;
  delete from public.stage_titles where stage_id = p_stage and profile_id = me;
  insert into public.stage_titles (stage_id, title, profile_id) values (p_stage, p_title, me);
end;
$$;

create or replace function public.stage_title_holders()
returns table (stage_code text, title text, profile_id uuid, full_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.code, t.title, t.profile_id, p.full_name
    from public.stage_titles t
    join public.stages s on s.id = t.stage_id
    join public.profiles p on p.id = t.profile_id
   where public.is_staff()
     and public.serves_stage(t.profile_id, t.stage_id);
$$;

revoke all on function public.claim_stage_title(smallint, text) from public, anon;
revoke all on function public.stage_title_holders() from public, anon;
grant execute on function public.claim_stage_title(smallint, text) to authenticated;
grant execute on function public.stage_title_holders() to authenticated, service_role;

notify pgrst, 'reload schema';
