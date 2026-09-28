-- 0019 — Rate limiting for sign-in, sign-up and password-reset requests.
--
-- Why: without a limit, anyone can try thousands of passwords against one
-- account, create accounts in bulk, or flood someone's inbox with reset
-- emails. Supabase Auth has limits of its own, but every request from this
-- app reaches Supabase from Vercel's servers, so those limits see Vercel's
-- address rather than the visitor's and can't tell visitors apart.
--
-- How: the app records one row per attempt, keyed by a *hashed* bucket such as
-- "signin-ip:<sha256 of the address>" — no email or IP address is stored in
-- readable form. rate_limit_hit() answers "is there room for one more in this
-- window?" and records the attempt if so.
--
-- Only the service role may touch any of it. If `anon` could call the
-- function, a stranger could fill someone else's bucket and lock them out.
--
-- Idempotent: safe to run more than once.

create table if not exists public.rate_limit_hits (
  bucket text        not null,
  hit_at timestamptz not null default now()
);

create index if not exists rate_limit_hits_bucket_time
  on public.rate_limit_hits (bucket, hit_at);

-- RLS on with no policies: invisible to browser (anon / authenticated) traffic.
alter table public.rate_limit_hits enable row level security;

revoke all on public.rate_limit_hits from public, anon, authenticated;
grant select, insert, delete on public.rate_limit_hits to service_role;

create or replace function public.rate_limit_hit(
  p_bucket         text,
  p_max            integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  if p_bucket is null or length(p_bucket) > 200
     or p_max < 1 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'rate_limit_hit: invalid arguments';
  end if;

  -- Two requests for the same bucket at the same instant must not both see
  -- "room for one more". The lock is released at the end of the transaction.
  perform pg_advisory_xact_lock(hashtext(p_bucket));

  delete from public.rate_limit_hits
   where bucket = p_bucket
     and hit_at < now() - make_interval(secs => p_window_seconds);

  select count(*) into recent
    from public.rate_limit_hits
   where bucket = p_bucket;

  if recent >= p_max then
    return false;               -- blocked attempts are not recorded
  end if;

  insert into public.rate_limit_hits (bucket) values (p_bucket);

  -- Now and then, sweep rows from buckets nobody has used for a day.
  if random() < 0.02 then
    delete from public.rate_limit_hits where hit_at < now() - interval '1 day';
  end if;

  return true;
end;
$$;

revoke execute on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant  execute on function public.rate_limit_hit(text, integer, integer) to service_role;
