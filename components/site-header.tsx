import { Suspense } from "react";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/dal";
import { ROLE_LABELS, isSiteAdminRole, isStageRole } from "@/lib/roles";
import { signOutAction } from "@/app/auth/actions";

const NAV = [
  { href: "/#history", label: "Our history" },
  { href: "/gallery", label: "Camp gallery" },
  { href: "/#join", label: "How to join" },
];

const navLink =
  "whitespace-nowrap text-sm text-ink-muted transition hover:text-ink";
const primaryButton =
  "whitespace-nowrap rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700";

/**
 * The auth-dependent corner of the header.
 *
 * Split out so the rest of the header does not wait on it. Everything here
 * needs cookies() and a round trip to the Supabase auth server; the logo and
 * the navigation need neither. Previously the whole header was one async
 * component, so the browser saw nothing at all — not the logo, not the nav —
 * until the session had been verified, on every public page including the
 * marketing homepage.
 *
 * Wrapped in <Suspense> by the caller, this now streams: the shell paints
 * immediately and the sign-in state fills in behind it. It is also the shape
 * PPR needs if the project later turns it on, at which point the shell becomes
 * genuinely static rather than merely early.
 */
async function HeaderAuth() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <>
        <Link href="/login" className={`${navLink} font-medium`}>
          Sign in
        </Link>
        <Link href="/signup" className={primaryButton}>
          Join us
        </Link>
      </>
    );
  }

  return (
    <>
      <span className="hidden text-right text-xs leading-tight sm:block">
        <span className="block font-medium text-ink">
          {profile.full_name ?? "Member"}
        </span>
        <span className="block text-ink-subtle">{ROLE_LABELS[profile.role]}</span>
      </span>
      {isStageRole(profile.role) ? (
        <Link href="/dashboard/stage" className={`hidden ${navLink} font-medium sm:block`}>
          Stage
        </Link>
      ) : null}
      {isSiteAdminRole(profile.role) ? (
        <Link href="/members" className={`hidden ${navLink} font-medium sm:block`}>
          Members
        </Link>
      ) : null}
      <Link href="/dashboard" className={primaryButton}>
        Dashboard
      </Link>
      <form action={signOutAction}>
        <button
          type="submit"
          className="rounded-lg border border-line px-3 py-2 text-sm text-ink-muted transition hover:border-brand-300 hover:text-ink"
        >
          Sign out
        </button>
      </form>
    </>
  );
}

/** Reserves the same horizontal space, so the header does not jump on load. */
function AuthPlaceholder() {
  return (
    <div aria-hidden className="flex items-center gap-3">
      <div className="h-4 w-14 rounded bg-line" />
      <div className="h-9 w-24 rounded-lg bg-line" />
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
      {/* Keyboard and screen-reader users land here first and can jump the
          navigation entirely. Visible only when focused. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50
                   focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2
                   focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3.5 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-lg bg-brand-700 text-xs font-bold text-white"
          >
            ES
          </span>
          <span className="text-sm font-semibold leading-tight text-ink">
            El-Salam
            <span className="block text-xs font-normal text-ink-subtle">
              Scouting Group
            </span>
          </span>
        </Link>

        <nav aria-label="Main" className="ml-auto hidden items-center gap-6 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={navLink}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 md:ml-0">
          <Suspense fallback={<AuthPlaceholder />}>
            <HeaderAuth />
          </Suspense>

          {/* Mobile navigation.
              There was none: the nav above is `hidden md:flex`, so on a phone
              the history, gallery and join links simply did not exist. Most of
              this group's members reach the site on a phone, which made half
              the public site unreachable for most of its audience.

              Built on <details>, so it needs no JavaScript, no client
              component and no state — it opens on tap, closes on Escape, and
              is announced correctly by screen readers out of the box. */}
          <details className="relative md:hidden">
            <summary
              aria-label="Menu"
              className="grid size-9 cursor-pointer list-none place-items-center rounded-lg
                         border border-line text-ink-muted transition hover:text-ink
                         [&::-webkit-details-marker]:hidden"
            >
              <svg
                aria-hidden
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                className="size-5"
              >
                <path d="M3 6h14M3 10h14M3 14h14" />
              </svg>
            </summary>
            <nav
              aria-label="Main"
              className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-line
                         bg-surface-raised p-2 shadow-lg"
            >
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-lg px-3 py-2 text-sm text-ink-muted
                             transition hover:bg-surface hover:text-ink"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
