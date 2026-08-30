# Frontend / UI Task — Landing Page Redesign (WOSM-inspired)

**From:** Backend team
**Date:** 29 Aug 2026
**Deliverable:** a branded landing page — custom palette, hero image carousel, "Our History" rope timeline.

---

## ⚠️ Read this first — four corrections to the original brief

The task description you were given contains four assumptions that don't match this repo. Following
them literally will cost you a day. Everything else in the brief stands.

**1. There is no `tailwind.config.ts`, and there shouldn't be.**
This project uses **Tailwind v4**, which is CSS-first — the config file is gone. Custom colours are
declared in an `@theme` block inside `app/globals.css`. Creating a `tailwind.config.ts` will do
nothing at all; the class names simply won't exist. See §1 for exactly how to add them.

**2. The page is `app/page.tsx`, not `src/app/page.tsx`.**
The App Router lives at the repo root. There *is* a `src/` folder, but Next.js **ignores `src/app`
entirely** when a root `app/` exists — anything you build there will never render. Components live
in root `components/`.

**3. Do NOT add `"use client"` to `app/page.tsx`.**
The page is a Server Component and must stay one: it renders `SiteShell` → `SiteHeader`, which reads
the signed-in user from the database to decide whether to show "Sign in" or the member's name and
dashboard links. Marking the page as a client component breaks that and will throw at build time.
Put `"use client"` only on the carousel component itself, exactly as the brief suggests — a client
component nested inside a server page is the correct pattern here.

**4. `placehold.co` images need a config change before `next/image` will load them.**
`next.config.ts` currently allow-lists only `res.cloudinary.com`. Either add the placeholder host to
`images.remotePatterns` (and remove it before launch), or — simpler for mockups — drop a few real
JPEGs into `public/hero/` and reference them as `/hero/1.jpg`. Local files need no config and are
closer to the final state anyway.

---

## What already exists (modify, don't rebuild)

`app/page.tsx` already has a working landing page: hero with a stats strip, an "Our History"
timeline, the camp gallery, and a join CTA. **Your job is to restyle and upgrade it, not start from
an empty file.** Two parts are wired to real systems and must keep working:

- **`<CampGallery />`** (`components/landing/camp-gallery.tsx`) pulls live albums from Cloudinary.
  Restyle it freely; don't replace the data fetching.
- **`<SiteShell />`** wraps the page with the header and footer, and the header is auth-aware.

The existing history section already uses a vertical line with year nodes — the rope timeline is a
restyle of that, not a new component.

## The design token system (please work with it, not around it)

Every page in the app — auth, dashboard, members, onboarding, gallery — is built on **semantic**
tokens rather than raw colours:

| Token | Meaning |
|---|---|
| `bg-canvas` | page background |
| `bg-surface` / `bg-surface-raised` | sunken and raised panels |
| `text-ink` / `text-ink-muted` / `text-ink-subtle` | primary / secondary / tertiary text |
| `border-line` | all borders and dividers |
| `bg-brand-600`, `text-brand-700`, … | the brand ramp (currently blue) |

These are defined in `app/globals.css` and each has a **light and a dark value** — the whole app
responds to the OS theme today.

**This matters for you:** if you rewrite the palette, every other page changes with it. That's a
feature, not a bug — one edit rebrands the whole portal. But it means:

- Rebrand by **changing what the tokens resolve to**, not by scattering `bg-scout-forest` across
  every page.
- If you add `scout-*` colours as *extra* names, use them for landing-page decoration only, and keep
  using semantic tokens for anything structural.
- Whatever you choose, **check the dashboard, members, login and onboarding pages afterwards.** A
  palette that looks great on a hero can make a form unreadable.

## 1. Adding the palette (Tailwind v4)

In `app/globals.css`, inside the existing `@theme` block:

```css
@theme {
  /* existing brand ramp … */

  --color-scout-sage: #e2f0cc;    // These are just examples
  --color-scout-apple: #8bc53d; 
  --color-scout-forest: #012f13;
  --color-scout-night: #011207;
}
```

The `--color-` prefix is what generates `bg-scout-forest`, `text-scout-sage`, `border-scout-apple`
and so on. No other step, no restart beyond the dev server picking up the CSS.

The four hex codes in the brief were explicitly marked as examples — pick the real ones. Two notes
if you keep values near these:

- `scout-forest` and `scout-night` are extremely dark (L* under 15). Beautiful as section
  backgrounds; unusable as body text on anything but near-white.
- `scout-apple` on `scout-sage` is roughly 2:1 contrast — fine for a large heading or a decorative
  rope, **fails WCAG AA for body text**. Check pairs at webaim.org/resources/contrastchecker before
  committing to them.

To rebrand the whole app rather than just the landing page, point the semantic tokens at the new
ramp — the `:root` and `prefers-color-scheme: dark` blocks in the same file.

## 2. Hero image carousel

New file: `components/landing/hero-carousel.tsx`, starting with `"use client"`.

**Required behaviour**

- Full-width, crossfading background images, auto-advancing every 4–5 seconds.
- Semi-transparent dark gradient over the images so white text stays readable.
- Group name + a prominent CTA ("Login to Portal" → `/login`, or "Join us" → `/signup`) overlaid.

**Requirements that aren't in the brief but aren't optional**

- **Respect `prefers-reduced-motion`.** `app/globals.css` already honours it globally for CSS
  animations, but a JS timer ignores that — check the media query in the component and don't
  auto-advance for users who've asked for less motion. Auto-playing carousels are a genuine problem
  for people with vestibular disorders.
- **Clear the interval on unmount** (`return () => clearInterval(id)` in the `useEffect`), or you'll
  leak timers on every client-side navigation.
- **Give viewers manual control** — dot indicators or prev/next arrows. A carousel that can only be
  watched is an accessibility failure and is also just annoying.
- **First image gets `priority`** on `next/image` so the largest-contentful-paint isn't delayed; the
  rest lazy-load.
- Images are decorative here — `alt=""` on them, and put the real text in the overlay as actual DOM
  text, not baked into the image.

## 3. "Our History" rope timeline

Restyle the existing timeline in `app/page.tsx`.

- Central vertical line styled as a rope — a thick dashed or textured border in `scout-apple` or
  `scout-forest`. A repeating CSS gradient makes a convincing rope twist without an image asset.
- Circular year nodes along it (2020, 2021, "2022 Summer Camp in Luxor", …).
- Alternate event text left and right of the rope.
- **Mobile:** an alternating two-column timeline collapses badly on narrow screens. Fall back to a
  single column with the rope on the left below `sm:`. Please check at 375px.
- Scroll-reveal animations are welcome, but again gate them behind `prefers-reduced-motion`.

The dates and events currently in the file are **invented placeholders** — I made them up as
scaffolding. Get the real ones from the group before this goes public; the same applies to the
"400+ / 6 / 1968 / 50+" stats in the hero.

## Ground rules

**Don't edit these** — they're backend-owned and changing them breaks auth or security:
`lib/` (except `globals.css` is not in there — that's yours), `proxy.ts`, `app/auth/`,
`app/members/`, `app/onboarding/`, `app/dashboard/`, `supabase/migrations/`.

Styling *inside* those pages is welcome later — coordinate first so we don't collide.

**CI must pass.** Every push runs `next typegen` → `tsc --noEmit` → `eslint` → `next build`
(`.github/workflows/ci.yml`). A red check blocks merging. Run `npm run build` locally before pushing.

**Check both themes.** The app follows the OS light/dark setting. Toggle it and look at the landing
page, the login page and the dashboard before calling it done.

## Deliverables

1. Updated `app/globals.css` with the palette in `@theme` (**not** a `tailwind.config.ts`).
2. `components/landing/hero-carousel.tsx` — client component, 4–5s crossfade, reduced-motion aware,
   manual controls, interval cleaned up.
3. Updated `app/page.tsx` — still a Server Component — combining the carousel, the rope timeline and
   the existing `<CampGallery />`.
4. A screenshot or two in the PR, light and dark, desktop and mobile.

Questions about anything above: ask backend before working around it. Most of the corrections in
this document exist because the constraint wasn't obvious from the outside.
