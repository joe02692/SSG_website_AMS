# Birth certificates — storage setup

Certificates live in **Backblaze B2**, bucket `ssg.ams.bc`, and are kept
**permanently**. B2 gives 10 GB free and did not ask for a credit card.

Photos are shrunk in the browser before upload (~1600px, ~500KB each), so
400 scouts costs roughly 200 MB — comfortably inside the free tier, forever.

## Setup — one time

Until this is done, the upload box says "Uploads aren't configured on this
deployment". Nothing else breaks.

**So you should:**

- **Check the bucket is PRIVATE.** B2 console → Buckets → `ssg.ams.bc` →
  Bucket Settings → Files in Bucket are: **Private**. This is the single most
  important setting on this page. Public would make every certificate readable
  by anyone with the URL.
- **Create an application key.** B2 console → **Application Keys** → *Add a New
  Application Key*:
  - Name: anything, e.g. `ssg-website`
  - Allow access to Bucket: **`ssg.ams.bc`** only (not "All")
  - Type of Access: **Read and Write**
  - Create it, then copy `keyID` and `applicationKey` — **the key is shown
    once**.
- **Note the endpoint and region.** On the Buckets page, the bucket shows an
  Endpoint like `s3.us-west-004.backblazeb2.com`. The region is the middle
  part — `us-west-004` in that example. Yours may differ.
- **Add the CORS rule** so browsers can upload. B2 console → bucket → **CORS
  Rules** → *Share everything in this bucket with all HTTPS origins* is the
  quick option; the safer custom rule allows only your origins with `PUT` and
  `GET`. Without a CORS rule the upload fails in the browser while everything
  else looks fine.
- **Add the environment variables** to `.env.local` AND to Vercel → Settings →
  Environment Variables:

```
B2_KEY_ID=your-key-id
B2_APP_KEY=your-application-key
B2_BUCKET=ssg.ams.bc
B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com
B2_REGION=us-west-004
```

- **Redeploy.** Environment variables only apply to new builds.
- **Clear the old test uploads**, which still point at Supabase Storage:

```sql
update public.scout_details
set document_path = null, document_uploaded_at = null;
```

Then delete the `scout-documents` bucket in Supabase → Storage.

Note `B2_ENDPOINT` includes `https://` and `B2_REGION` does not.

## ⚠️ The security trade this made

In Supabase Storage the **database** decided who could read a file — an RLS
policy compared the file's folder to `auth.uid()`, so even a bug in the
application could not hand a certificate to the wrong person.

**Backblaze has no idea what a Supabase user is.** Access control now lives
entirely in three places:

- `app/dashboard/profile/document-actions.ts` — issues upload URLs. Builds the
  key from the session's own profile id, never from the request body.
- `app/members/scouts/actions.ts` — issues view/download links, site admins only.
- `app/members/scouts/download-all/route.ts` — the bulk ZIP, site admins only.

Those three checks are the only thing protecting children's identity
documents. There is no second line of defence. Review changes to them
carefully, and never make the bucket public.

## How it behaves

- Uploads go **browser → Backblaze directly**, never through our server.
  Server Actions cap request bodies at 1 MB and Vercel functions at ~4.5 MB.
- Links are **minted on click and expire in 60 seconds**. Nothing viewable
  sits in the page source.
- Keys are `<profile_id>/<uuid>.<ext>`, so ownership is always checkable.
- Replacing a document deletes the previous file.
- **No automatic deletion.** `vercel.json` no longer schedules anything and
  `/api/cron/expire-documents` is a no-op. `document_uploaded_at` is still
  recorded, so a retention policy could be reinstated later if the group ever
  wants one.

## Watch the free tier

B2 free: **10 GB storage**, and **1 GB of downloads per day**. Storage is not
a concern at ~500 KB per file. Downloads could be: "Download all certificates"
pulls every file at once, so doing that repeatedly in one day can hit the daily
cap. Use it deliberately, not as a browsing habit.
