-- ============================================================================
-- A wrong invite code must fail the signup, not quietly create a scout.
--
-- Before this, handle_new_user() treated an unusable code as "no code" and
-- fell back to scout. Someone typing one character wrong got an account with
-- the wrong role and no indication anything had gone amiss — then had to be
-- deleted and re-registered by hand.
--
-- Two changes, deliberately belt-and-braces:
--
--   1. invite_code_is_valid() lets the signup form check a code *before*
--      creating anything, so the person gets "that code isn't valid" under the
--      field instead of a failed request.
--   2. handle_new_user() now RAISES on an unusable code. The trigger runs
--      inside the same transaction as the insert into auth.users, so the
--      exception rolls the whole signup back — no orphaned account. This also
--      closes the gap where a code is valid at step 1 and consumed by someone
--      else a second later.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Pre-flight check, callable before the account exists
--
--    SECURITY DEFINER because leader_invites is readable only by the head site
--    admin — an anonymous visitor must be able to ask "is this code good?"
--    without being able to read the table.
--
--    It returns a bare boolean and nothing else: no role, no note, no expiry.
--    In principle that's an oracle for guessing codes, which is why codes are
--    8 characters from a 31-character alphabet — around 850 billion
--    possibilities, so guessing is not a realistic attack.
-- ----------------------------------------------------------------------------
create or replace function public.invite_code_is_valid(code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.leader_invites li
     where li.code = invite_code_is_valid.code
       and li.used_at is null
       and (li.expires_at is null or li.expires_at > now())
  );
$$;

comment on function public.invite_code_is_valid(text) is
  'True when a code exists, is unused and unexpired. Returns nothing else — callable by anon so the signup form can validate before creating an account.';

grant execute on function public.invite_code_is_valid(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. The signup trigger now refuses a bad code outright
-- ----------------------------------------------------------------------------
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
       and used_at is null
       and (expires_at is null or expires_at > now())
    returning grants_role into granted;

    -- No row matched: the code is wrong, already spent, or expired. Abort the
    -- whole signup rather than silently downgrading them to a scout.
    if granted is null then
      raise exception 'ELSALAM_INVALID_INVITE'
        using errcode = 'P0001',
              hint = 'The invite code is not valid, has expired, or has already been used.';
    end if;

    final_role := granted;
  end if;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    final_role
  )
  on conflict (id) do nothing;

  -- Don't leave the (now spent) code sitting in the user's metadata.
  if invite_code is not null then
    update auth.users
       set raw_user_meta_data = raw_user_meta_data - 'leader_invite_code'
     where id = new.id;
  end if;

  return new;
end;
$$;
