<div align="center">

<img src="public/elsalam-logo.png" alt="Elsalam Scout Groups" width="280" />

# El-Salam Scouting Group

**Web Portal & Association Management System**

Public landing page and a signed-in AMS for 400+ scouts, leaders and families.

[Live site](https://ssg-website-ams.vercel.app) · [Join](https://ssg-website-ams.vercel.app/signup) · [Sign in](https://ssg-website-ams.vercel.app/login)

</div>

---

## What this is

Two products in one Next.js app:

1. **Public portfolio** — history, camp gallery, how to join.
2. **Internal AMS** — auth, onboarding, roles, member roster, and private documents.

| | Public site | Members area |
| --- | --- | --- |
| Who | Anyone | Signed-in members |
| Pages | `/`, `/gallery` | `/dashboard`, `/members`, `/onboarding` |
| Media | Cloudinary albums | Backblaze B2 (signed URLs) |

---

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 16 (App Router) + React 19 |
| Auth + database | Supabase (PostgreSQL, RLS) |
| Gallery | Cloudinary (`gallery/` folder) |
| Documents | Backblaze B2 (S3 API) |
| Hosting | Vercel |

Roles, least to most privileged:

`scout` → `pending_leader` → `stage_leader` → `stage_admin` → `site_admin` → `head_site_admin`

A leader signup creates a **request**, not a role. Until a head site admin approves it, that account can only see `/pending`.

---

## Getting started

```bash
# Install dependencies
npm install

# Add env vars (see below)
# then start the App Router dev server
npm run dev
```

Open http://localhost:3000

```bash
# Production build
npm run build

# Lint
npm run lint
```

### Environment

Create `.env.local` (never commit it). Variables this repo reads:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

B2_KEY_ID=
B2_APP_KEY=
B2_BUCKET=
B2_ENDPOINT=
B2_REGION=

NEXT_PUBLIC_SITE_URL=http://localhost:3000

RESEND_API_KEY=
EMAIL_FROM=
ADMIN_NOTIFICATION_EMAILS=
```

Apply SQL in `supabase/migrations/` in order (`0001` … `0018`) in the Supabase SQL editor.

Drop camp photos in Cloudinary under `gallery/<album-name>/`. The site picks them up on the next cache refresh.

---

## Layout

```
app/            routes: landing, gallery, auth, dashboard, members
components/     site shell, gallery, onboarding, member tables
lib/            DAL, roles, Cloudinary, B2, email
supabase/       numbered migrations
public/         static assets (group logo)
```

Authorisation lives in `lib/dal.ts` and Postgres RLS. `proxy.ts` only refreshes cookies and redirects unsigned visitors.

---

<div align="center">

**مجموعات السلام الكشفية** · Elsalam Scout Groups

Character, service and friendship since 1968

</div>
