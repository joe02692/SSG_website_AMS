-- ============================================================================
-- Automatic expiry for birth certificates.
--
-- Records WHEN a document was uploaded, so a scheduled job can delete the ones
-- that have outlived their purpose. This is the whole reason the certificates
-- can stay on Supabase's free 1 GB tier: they never accumulate.
--
-- It is also the data-retention policy. A scouting group has a good reason to
-- LOOK at a child's birth certificate, and no reason to keep a copy of it
-- forever. Deleting by default is the responsible posture, not a limitation.
--
-- Note the schedule itself lives in vercel.json, not here — Supabase Storage
-- has no lifecycle rules, so a daily job calls /api/cron/expire-documents.
-- ============================================================================

alter table public.scout_details
  add column if not exists document_uploaded_at timestamptz;

comment on column public.scout_details.document_uploaded_at is
  'When the current document was uploaded. Drives automatic expiry; NULL whenever document_path is NULL.';

-- Anything already uploaded gets today's date rather than being deleted on the
-- first run of the job.
update public.scout_details
   set document_uploaded_at = now()
 where document_path is not null
   and document_uploaded_at is null;

-- The expiry job filters on this; tiny table today, but the index costs
-- nothing and stops a sequential scan once there are hundreds of scouts.
create index if not exists scout_details_document_uploaded_at_idx
  on public.scout_details (document_uploaded_at)
  where document_path is not null;
