-- ============================================================================
-- Private storage for scouts' birth certificates / ID documents
-- (صورة لشهادة الميلاد).
--
-- This is the most sensitive data in the system: identity documents belonging
-- to children. Three rules follow from that, and they're all enforced here
-- rather than in the app:
--
--   1. The bucket is PRIVATE. There is no public URL for these files, ever.
--      Reading one requires a signed URL minted server-side, valid for
--      minutes. A public bucket would mean a leaked path is a permanent leak.
--   2. Files live under a folder named after the owner's user id, and the
--      policies below compare that folder to auth.uid(). A member can only
--      ever touch their own document, whatever path they ask for.
--   3. The bucket itself caps size and MIME type. The browser's `accept`
--      attribute is a hint to the file picker, not a control — this is the
--      part an attacker can't skip.
--
-- Uploads go from the browser straight to Supabase Storage, not through a
-- Server Action. Two reasons: Server Actions cap request bodies at 1MB by
-- default, and Vercel's serverless functions cap them at ~4.5MB regardless of
-- config — a phone photo of a certificate is routinely larger than both.
-- Going direct also keeps the file off our server entirely.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'scout-documents',
  'scout-documents',
  false,                     -- private. Do not flip this.
  10485760,                  -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- Policies on storage.objects
--
-- Path convention: <user_id>/<filename>. storage.foldername(name) splits the
-- path, so [1] is the owning user's id.
-- ----------------------------------------------------------------------------

drop policy if exists "scout docs: read own" on storage.objects;
create policy "scout docs: read own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'scout-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "scout docs: site admins read" on storage.objects;
create policy "scout docs: site admins read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'scout-documents'
    and public.is_site_admin()
  );

drop policy if exists "scout docs: upload own" on storage.objects;
create policy "scout docs: upload own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'scout-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "scout docs: replace own" on storage.objects;
create policy "scout docs: replace own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'scout-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'scout-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "scout docs: delete own" on storage.objects;
create policy "scout docs: delete own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'scout-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Note: stage leaders deliberately get NO access. Seeing which stage a scout
-- is in does not require seeing their birth certificate. If leaders ever need
-- to verify documents, add a policy scoped to their own stage — don't widen
-- these.
