<div align="center">
 
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
 
<br />
 
<a href="https://ssg-website-ams.vercel.app">
  <img
    src="https://res.cloudinary.com/gur2aywx/image/upload/f_auto,q_auto,c_fill,g_auto,w_1200,h_520,e_art:audrey/Screenshot_2026-07-26_103644"
    alt="El-Salam camp gallery hero"
    width="920"
  />
</a>
 
<img src="https://readme-typing-svg.demolab.com?font=Verdana&size=16&duration=3500&pause=700&color=40564A&center=true&vCenter=true&width=720&lines=400%2B+active+members+%C2%B7+6+sections+%C2%B7+50%2B+camps+a+year;Hike.+Camp.+Serve.+Grow+up+a+little+braver." alt="Group stats" />
 
</div>
 
---
 
## Camp gallery
 
Photos served live from Cloudinary (`gallery/` folder) on the [public site](https://ssg-website-ams.vercel.app/gallery). Hover-scale on the web; here they sit as a strip from the same album.
 
<p align="center">
  <a href="https://ssg-website-ams.vercel.app/gallery/Test">
    <img src="https://res.cloudinary.com/gur2aywx/image/upload/f_auto,q_auto,c_fill,g_auto,w_400,h_300/Screenshot_2026-07-26_103644" width="32%" alt="Camp photo 1" />
  </a>
  <a href="https://ssg-website-ams.vercel.app/gallery/Test">
    <img src="https://res.cloudinary.com/gur2aywx/image/upload/f_auto,q_auto,c_fill,g_auto,w_400,h_300/Screenshot_2026-07-26_103046" width="32%" alt="Camp photo 2" />
  </a>
  <a href="https://ssg-website-ams.vercel.app/gallery/Test">
    <img src="https://res.cloudinary.com/gur2aywx/image/upload/f_auto,q_auto,c_fill,g_auto,w_400,h_300/Screenshot_2026-07-20_125809" width="32%" alt="Camp photo 3" />
  </a>
</p>
 
<p align="center">
  <a href="https://ssg-website-ams.vercel.app/gallery/Test">
    <img src="https://res.cloudinary.com/gur2aywx/image/upload/f_auto,q_auto,c_fill,g_auto,w_400,h_300/Screenshot_2026-07-25_101745" width="32%" alt="Camp photo 4" />
  </a>
  <a href="https://ssg-website-ams.vercel.app/gallery/Test">
    <img src="https://res.cloudinary.com/gur2aywx/image/upload/f_auto,q_auto,c_fill,g_auto,w_400,h_300/Screenshot_2026-07-24_005121" width="32%" alt="Camp photo 5" />
  </a>
  <a href="https://ssg-website-ams.vercel.app/gallery/Test">
    <img src="https://res.cloudinary.com/gur2aywx/image/upload/f_auto,q_auto,c_fill,g_auto,w_400,h_300/Screenshot_2026-07-12_113840" width="32%" alt="Camp photo 6" />
  </a>
</p>
 
<p align="center">
  <a href="https://ssg-website-ams.vercel.app/gallery">Browse all albums on the site</a>
</p>
 
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
 
 
Useful scripts:
 
```bash
# Production build
npm run build
 
# Lint
npm run lint
```
 
Drop camp photos into the Cloudinary Media Library folder `gallery/<album-name>/`. The landing page and `/gallery` pick them up on the next cache refresh (about an hour).
 
---
 
## Project map
 
```
app/            routes: landing, gallery, auth, dashboard, members
components/     site shell, gallery tiles, onboarding, member tables
lib/            DAL, roles, Cloudinary, B2 signed URLs, email
supabase/       numbered SQL migrations (0001 ... 0018)
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

<img
  src="https://res.cloudinary.com/gur2aywx/image/upload/f_auto,q_auto,c_fill,g_auto,w_960,h_280/Screenshot_2026-07-24_005121"
  alt="Camp strip"
  width="720"
/>
 
<br /><br />
 
<sub>El-Salam Scouting Group · character, service and friendship since 1968</sub>
 
</div>