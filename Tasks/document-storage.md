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
- **Add the CORS rule** by running, in the project folder:

  ```
  node scripts/set-b2-cors.mjs
  ```

  **The web console cannot do this.** All four of its options write the same
  rule — Backblaze's docs name it `downloadFromAnyOrigin` — whose operations
  are `b2_download_file_by_id` and `b2_download_file_by_name`. There is no
  upload operation in it. Ticking *"Share everything in this bucket with all
  HTTPS origins"* and applying it to *Both* APIs still refuses every browser
  upload, and refuses it by omitting the CORS headers, so the browser reports
  it exactly as if no rule had ever been set — sending you to look for a rule
  you know you configured.

  The rule the script writes allows the S3 upload operation (plus get, head
  and delete), with `allowedHeaders: ["*"]`. That last part is not padding: the
  upload sends `Content-Type: image/jpeg`, which is not on the browser's
  safelist, so a preflight `OPTIONS` goes first and is refused unless
  `content-type` is allowed. Operations without headers is the near-miss.

  It reads `.env.local`, applies the rule, and prints back what Backblaze
  stored. Change the allowed origins with `B2_CORS_ORIGINS` (comma-separated)
  when the deployment URL changes.

  If it stops because the key lacks `writeBuckets` — keys scoped to one bucket
  usually do — create a key with access to **all** buckets, use it in
  `.env.local` for that single run, then put the scoped key back. Only this
  script needs the wider key; the app never does.

  Note it talks to the B2 **native** API, not the S3 one. S3's
  `PutBucketCors` refuses any bucket that already holds native rules, and the
  console's rule is native — so once those radio buttons have been touched even
  once, the native API is the only remaining route.

  It also sends a *superset* of operation names and lets Backblaze strike out
  what it doesn't recognise, printing what it dropped. That looks like belt and
  braces; it isn't. Backblaze's documentation lists `s3_put_object`, and the
  API answers `unknown allowedOperation value: s3_put_object`. Since the docs
  and the API disagree, the script asks the API. It also survives Backblaze
  renaming these later.
- **Add the environment variables** to `.env.local` AND to Vercel → Settings →
  Environment Variables:

```
B2_KEY_ID=your-key-id
B2_APP_KEY=your-application-key
B2_BUCKET=SSG.AMS.BC
B2_ENDPOINT=https://s3.eu-central-003.backblazeb2.com
B2_REGION=eu-central-003
```

`B2_BUCKET` must be the bucket name **exactly as the console shows it**, and
`B2_ENDPOINT` / `B2_REGION` must be the region the bucket actually lives in
(ours is `eu-central-003`, not the `us-west-004` in Backblaze's examples).

- **Redeploy.** Environment variables only apply to new builds.
- **Clear the old test uploads**, which still point at Supabase Storage:

```sql
update public.scout_details
set document_path = null, document_uploaded_at = null;
```

Then delete the `scout-documents` bucket in Supabase → Storage.

Note `B2_ENDPOINT` includes `https://` and `B2_REGION` does not.

## Troubleshooting

**"Uploads aren't configured on this deployment — missing B2_KEY_ID, …"**
Exactly what it says: those variables aren't visible to the running app. The
message names the ones that are absent, so fix those and nothing else.

- Locally: they go in `.env.local` at the repo root, and **`npm run dev` must
  be restarted** — env files are read once at boot.
- On Vercel: Settings → Environment Variables, ticked for **Production**
  (and Preview, if you test on preview URLs), then **Redeploy**. Adding a
  variable does nothing to a build that already exists.

**"Storage rejected the upload request. The settings are present but not
working."** All five variables are set, so it's the values or the key. Check
the server log line beginning `[certificate]` — `npm run dev`'s terminal
locally, or Vercel → the deployment → Runtime Logs. Usual causes: the
application key was scoped to a different bucket, `B2_REGION` doesn't match
the endpoint, or the key was regenerated in B2 and never updated here.

**"The browser couldn't reach the storage service."** The upload got as far as
"Uploading…" and then the browser refused. That request goes straight from the
browser to Backblaze, so our server never sees it and the logs say nothing.
Open **DevTools → Console** for the real error. Two causes:

- **CORS.** If the Console says *"Response to preflight request doesn't pass
  access control check: No 'Access-Control-Allow-Origin' header"*, run
  `node scripts/set-b2-cors.mjs`. A canned console rule is not enough — see the
  setup step above for why. Remember too that a rejection Backblaze sends
  *without* CORS headers is equally invisible to the browser, so an
  authentication error can wear the same disguise.
- **A checksum baked in at signing time.** Fixed in `lib/b2.ts` on 5 Sep 2026,
  recorded here because the symptom is baffling. Recent AWS SDK versions default
  to attaching `x-amz-checksum-crc32` to a PutObject — but for a presigned URL
  the checksum is computed while signing, when there is no body, so the URL
  carried the CRC32 of nothing and every real upload was a mismatch. Cured with
  `requestChecksumCalculation: "WHEN_REQUIRED"`. If those parameters ever
  reappear in a signed URL after an SDK upgrade, this is what came back.
- **The bucket name.** Ours is `SSG.AMS.BC`. Backblaze's S3-compatible API
  documents **lowercase only**, and advises sticking to lowercase letters,
  numbers and hyphens, because periods break virtual-hosted-style HTTPS: they
  add DNS labels the wildcard certificate doesn't cover.

  We are not hitting the certificate problem — the SDK addresses this bucket
  path-style (`…backblazeb2.com/SSG.AMS.BC/<key>`), which `lib/b2.ts` now pins
  explicitly with `forcePathStyle: true`. The capitals are the remaining
  question mark. If CORS is correct and uploads still fail, **create a bucket
  named `ssg-ams-bc`** and point `B2_BUCKET` at it. It costs nothing while the
  bucket is empty and removes the last variable Backblaze warns about.

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
