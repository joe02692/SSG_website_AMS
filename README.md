<div align="center">

<img src="public/elsalam-logo.png" alt="Elsalam Scout Groups" width="280" />

<img src="https://readme-typing-svg.demolab.com?font=Georgia&weight=700&size=32&duration=2800&pause=900&color=15803D&center=true&vCenter=true&width=820&lines=El-Salam+Scouting+Group;Character%2C+service+and+friendship;Since+1968" alt="El-Salam Scouting Group" />

<p>
  <a href="https://ssg-website-ams.vercel.app">
    <img src="https://img.shields.io/badge/Live_site-ssg--website--ams-15803d?style=for-the-badge" alt="Live site" />
  </a>
  <img src="https://img.shields.io/badge/Next.js-16.3-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Vercel-Hosting-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
</p>

<p><strong>Public portal + Association Management System</strong> for 400+ scouts, leaders and families.</p>

<img src="https://readme-typing-svg.demolab.com?font=Verdana&size=16&duration=3500&pause=700&color=40564A&center=true&vCenter=true&width=720&lines=400%2B+active+members+%C2%B7+6+sections+%C2%B7+50%2B+camps+a+year;Hike.+Camp.+Serve.+Grow+up+a+little+braver." alt="Group stats" />

</div>

---

## Two products, one codebase

| Public portfolio | Internal AMS |
| --- | --- |
| Landing page, history timeline, camp gallery | Auth, onboarding, roles, member roster |
| Cloudinary albums under `gallery/` | Scout + leader registration, ID documents |
| Open to visitors | Signed-in members only |

```mermaid
flowchart LR
    Visitor["Visitor"] --> Site["ssg-website-ams.vercel.app"]
    Site --> Public["Landing and gallery"]
    Site --> Auth["Sign in / Join"]
    Auth --> Scout["Scout dashboard"]
    Auth --> Leader["Leader request then pending"]
    Auth --> Admin["Head admin members console"]
    Public --> Cloudinary["Cloudinary gallery/"]
    Scout --> Supabase["Supabase Postgres + RLS"]
    Leader --> Supabase
    Admin --> Supabase
    Scout --> B2["Backblaze B2 documents"]
    Admin --> B2
```

---

## History (from the homepage)

```mermaid
timeline
    title Nearly sixty years in the same neighbourhood
    1968 : The first troop : Twenty scouts in a borrowed hall
    1985 : A permanent home : The group opens its own scout house
    2004 : Growing the sections : Cubs and Rovers join the original troop
    2026 : Going digital : Records move into this AMS
```

---

## Tech stack

| Layer | Choice |
| --- | --- |
| App | Next.js 16 (App Router) + React 19 |
| Auth + DB | Supabase (PostgreSQL, RLS, Auth) |
| Gallery | Cloudinary Admin API, private-folder convention |
| Documents | Backblaze B2 (S3 API, signed URLs) |
| Hosting | Vercel |

Roles (least to most privileged): `scout` / `pending_leader` / `stage_leader` / `stage_admin` / `site_admin` / `head_site_admin`.

Pending leaders can sign in and wait. They cannot reach the dashboard until a head site admin approves them.

---

## Getting started

```bash
# Install dependencies
npm install

# Copy env vars, then fill in Supabase, Cloudinary and B2 keys
cp .env.example .env.local

# Run the App Router dev server
npm run dev
```

Open http://localhost:3000

Useful scripts:

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

Drop camp photos in Cloudinary under `gallery/<album-name>/`. The landing page and `/gallery` pick them up on the next cache refresh (about an hour).

---

## Project map

```
app/            routes: landing, gallery, auth, dashboard, members
components/     site shell, gallery tiles, onboarding, member tables
lib/            DAL, roles, Cloudinary, B2 signed URLs, email
supabase/       numbered SQL migrations (0001 ... 0018)
public/         static assets (group logo)
```

Authorisation lives in `lib/dal.ts` and Postgres RLS. `proxy.ts` only refreshes cookies and redirects unsigned visitors.

---

<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Georgia&size=18&duration=4000&pause=1200&color=116631&center=true&vCenter=true&width=640&lines=Ready+to+join+us%3F;Create+a+scout+account+in+a+minute." alt="Join us" />

<p>
  <a href="https://ssg-website-ams.vercel.app/signup"><strong>Create an account</strong></a>
  &nbsp;·&nbsp;
  <a href="https://ssg-website-ams.vercel.app/login"><strong>Sign in</strong></a>
  &nbsp;·&nbsp;
  <a href="https://ssg-website-ams.vercel.app"><strong>Visit the site</strong></a>
</p>

**مجموعات السلام الكشفية** · Elsalam Scout Groups

<sub>Character, service and friendship since 1968</sub>

</div>
