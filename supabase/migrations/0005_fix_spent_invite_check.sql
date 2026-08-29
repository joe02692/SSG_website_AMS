-- ============================================================================
-- Fixes a hole in the "single-use" guarantee on invite codes.
--
-- leader_invites.used_by is `references auth.users (id) on delete set null`,
-- so deleting the member who redeemed a code silently NULLs used_by. The
-- trigger tested `used_by is null` to decide whether a code was still
-- available — meaning a spent code became redeemable again the moment its
-- redeemer's account was deleted.
--
-- used_at is the honest record: it is set once and never cleared by a
-- cascade. Test that instead. (Keeping used_by nullable is correct — it's a
-- convenience pointer for display, not the source of truth.)
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested   text;
  invite_code text;
  granted     public.user_role;
  final_role  public.user_role;
begin
  requested   := nullif(trim(new.raw_user_meta_data ->> 'requested_role'), '');
  invite_code := nullif(trim(new.raw_user_meta_data ->> 'leader_invite_code'), '');

  final_role := case
                  when requested = 'parent' then 'parent'::public.user_role
                  else 'scout'::public.user_role
                end;

  if invite_code is not null then
    update public.leader_invites
       set used_by = new.id,
           used_at = now()
     where code = invite_code
       and used_at is null                              -- was: used_by is null
       and (expires_at is null or expires_at > now())
    returning grants_role into granted;

    if granted is not null then
      final_role := granted;
    end if;
  end if;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    final_role
  )
  on conflict (id) do nothing;

  if invite_code is not null then
    update auth.users
       set raw_user_meta_data = raw_user_meta_data - 'leader_invite_code'
     where id = new.id;
  end if;

  return new;
end;
$$;

-- Any code whose redeemer has since been deleted: used_by is NULL but used_at
-- still records the redemption. Nothing to repair — the new check reads
-- used_at, so those codes correctly stay spent.
