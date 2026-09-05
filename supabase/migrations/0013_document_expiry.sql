-- ============================================================================
-- Records WHEN a birth certificate was uploaded.
--
-- HISTORY, because the file name is now misleading: this migration was written
-- to drive automatic expiry — a nightly job deleting certificates older than N
-- days, which was the only way they fitted on Supabase Storage's free 1 GB.
-- That design is gone. Certificates live in Backblaze B2 and are kept
-- permanently by decision of the group; vercel.json schedules nothing and
-- /api/cron/expire-documents is a deliberate no-op.
--
-- The column survives the design that motivated it, and is worth having on its
-- own: it answers "when did we receive this?", and it leaves the door open if
-- the group ever adopts a retention policy after all. Nothing deletes anything.
--
-- The file keeps its number so migration order stays stable.
-- ============================================================================

alter table public.scout_details
  add column if not exists document_uploaded_at timestamptz;

comment on column public.scout_details.document_uploaded_at is
  'When the current document was uploaded. Informational; nothing expires. NULL whenever document_path is NULL.';

-- Backfill anything uploaded before this column existed. now() is a lie for
-- those rows, but a defensible one — the alternative is a NULL that reads as
-- "no document" when there plainly is one.
update public.scout_details
   set document_uploaded_at = now()
 where document_path is not null
   and document_uploaded_at is null;

-- Tiny table today, but the index costs nothing and stops a sequential scan
-- once there are hundreds of scouts to report on.
create index if not exists scout_details_document_uploaded_at_idx
  on public.scout_details (document_uploaded_at)
  where document_path is not null;

-- PostgREST answers from a cached copy of the schema, and rejects a write
-- mentioning an unknown column *before* Postgres ever sees it — the
-- "PGRST204: Could not find the 'document_uploaded_at' column ... in the schema
-- cache" error. Supabase usually reloads on its own; asking explicitly means
-- the app works the moment this finishes rather than a few seconds later.
notify pgrst, 'reload schema';
