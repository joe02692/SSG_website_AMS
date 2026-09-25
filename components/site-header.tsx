import { Suspense } from "react";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/dal";
import {
  isPendingRole,
  isSiteAdminRole,
  isStageRole,
} from "@/lib/roles";
import { signOutAction } from "@/app/auth/actions";
import { BrandLogo } from "@/components/brand-logo";
import { MobileMenu } from "@/components/mobile-menu";
import { NavLink } from "@/components/nav-link";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/#history", label: "Our History" },
  { href: "/gallery", label: "Activities" },
  { href: "/signup", label: "Join Us" },
];

const navLink = "whitespace-nowrap font-bold text-white transition hover:text-butter";

/* Yellow button, forest text. The design had white text here, which is
   1.34:1 on this yellow — unreadable. Forest is 8.18:1. */
const sunButton =
  "whitespace-nowrap rounded-md bg-sun px-3 py-2 text-sm font-bold text-forest transition hover:opacity-85 sm:px-[22px] sm:py-2.5 sm:text-base";

const ghostButton =
  "whitespace-nowrap rounded-md border-2 border-white/40 px-3 py-2 text-sm font-bold text-white transition hover:border-white";

const menuLink =
  "block w-full rounded-lg p-3 text-left text-lg text-cream transition hover:bg-cream/10";

/**
 * The auth-dependent corner of the header.
 *
 * Split out so the rest of the header does not wait on it: everything here
 * needs cookies() and a round trip to Supabase; the logo and the navigation
 * need neither. Wrapped in <Suspense> by the caller, so the bar paints at once
 * and the sign-in state streams in behind it.
 */
async function HeaderAuth() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <Link href="/login" className={sunButton}>
        Log in
      </Link>
    );
  }

  // A pending account gets its status page and nothing else — Dashboard or
  // Members would only bounce it back there.
  if (isPendingRole(profile.role)) {
    return (
      <>
        <Link href="/pending" className={sunButton}>
          {/* The full label doesn't fit beside the logo on a 320px phone. */}
          <span className="sm:hidden">Status</span>
          <span className="hidden sm:inline">Request status</span>
        </Link>
        <SignOutButton className={`hidden md:block ${ghostButton}`} />
      </>
    );
  }

  return (
    <>
      <Link href="/dashboard" className={sunButton}>
        Dashboard
      </Link>
      <SignOutButton className={`hidden md:block ${ghostButton}`} />
    </>
  );
}

/** Members-area links, for the desktop nav. Nothing for signed-out visitors. */
async function StaffLinks() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  return (
    <>
      {isStageRole(profile.role) ? (
        <NavLink href="/dashboard/stage" className={navLink}>
          Stage
        </NavLink>
      ) : null}
      {isSiteAdminRole(profile.role) ? (
        <NavLink href="/members" className={navLink}>
          Members
        </NavLink>
      ) : null}
    </>
  );
}

/** The same, plus sign-in / sign-out, for the mobile menu. */
async function MenuAuth() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <Link href="/login" className={menuLink}>
        Log in
      </Link>
    );
  }

  if (isPendingRole(profile.role)) {
    return (
      <>
        <Link href="/pending" className={menuLink}>
          Request status
        </Link>
        <SignOutButton className={menuLink} />
      </>
    );
  }

  return (
    <>
      <Link href="/dashboard" className={menuLink}>
        Dashboard
      </Link>
      {isStageRole(profile.role) ? (
        <Link href="/dashboard/stage" className={menuLink}>
          Stage
        </Link>
      ) : null}
      {isSiteAdminRole(profile.role) ? (
        <Link href="/members" className={menuLink}>
          Members
        </Link>
      ) : null}
      <SignOutButton className={menuLink} />
    </>
  );
}

function SignOutButton({ className }: { className: string }) {
  return (
    <form action={signOutAction} className="contents">
      <button type="submit" className={className}>
        Sign out
      </button>
    </form>
  );
}

/** Reserves the button's space so the bar doesn't jump when auth resolves. */
function AuthPlaceholder() {
  return <div aria-hidden className="h-11 w-24 rounded-md bg-white/10" />;
}

export function SiteHeader() {
  return (
    <header className="header-lift on-dark sticky top-0 z-50 w-full bg-forest">
      {/* Keyboard and screen-reader users can jump the navigation entirely.
          Visible only when focused. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50
                   focus:rounded-md focus:bg-sun focus:px-4 focus:py-2
                   focus:text-sm focus:font-bold focus:text-forest"
      >
        Skip to content
      </a>

      <div className="mx-auto flex h-20 max-w-[1200px] items-center justify-between gap-2 px-3 min-[380px]:px-5 sm:gap-4 sm:px-8">
        <BrandLogo />

        <div className="flex items-center gap-2 sm:gap-4">
          <nav aria-label="Main" className="hidden items-center gap-5 md:flex">
            {NAV.map((item) => (
              <NavLink key={item.href} href={item.href} className={navLink}>
                {item.label}
              </NavLink>
            ))}
            <Suspense fallback={null}>
              <StaffLinks />
            </Suspense>
          </nav>

          <Suspense fallback={<AuthPlaceholder />}>
            <HeaderAuth />
          </Suspense>

          <MobileMenu>
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className={menuLink}>
                {item.label}
              </Link>
            ))}
            <Suspense fallback={null}>
              <MenuAuth />
            </Suspense>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
