import { Suspense } from "react";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/dal";
import {
  isPendingRole,
  isSiteAdminRole,
  isStageRole,
  isStaffRole,
} from "@/lib/roles";
import { signOutAction } from "@/app/auth/actions";
import { BrandLogo } from "@/components/brand-logo";
import { MobileMenu } from "@/components/mobile-menu";
import { NavLink } from "@/components/nav-link";
import { LanguageSwitch } from "@/components/language-switch";
import { getT } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// Split in two so leaders' "Seasonal Plan" link can sit right after
// "Our History" without the whole nav waiting on the sign-in check.
const navBefore = (t: Dictionary) => [
  { href: "/", label: t.chrome.nav.home },
  { href: "/history", label: t.chrome.nav.history },
];
const navAfter = (t: Dictionary) => [
  { href: "/stages", label: t.chrome.nav.stages },
  { href: "/gallery", label: t.chrome.nav.activities },
  { href: "/signup", label: t.chrome.nav.joinUs },
];

const navLink = "whitespace-nowrap text-sm xl:text-[15px] font-bold text-white transition hover:text-butter";

/* Yellow button, forest text. The design had white text here, which is
   1.34:1 on this yellow — unreadable. Forest is 8.18:1. */
const sunButton =
  "whitespace-nowrap rounded-md bg-sun px-3 py-2 text-sm font-bold text-forest transition hover:opacity-85 sm:px-[22px] sm:py-2.5 sm:text-base";

const ghostButton =
  "whitespace-nowrap rounded-md border-2 border-white/40 px-3 py-2 text-sm font-bold text-white transition hover:border-white";

const menuLink =
  "block w-full rounded-lg px-3 py-2.5 text-start text-base text-cream transition hover:bg-cream/10";

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
  const t = await getT();

  if (!profile) {
    return (
      <Link href="/login" className={sunButton}>
        {t.chrome.logIn}
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
          <span className="sm:hidden">{t.chrome.status}</span>
          <span className="hidden sm:inline">{t.chrome.requestStatus}</span>
        </Link>
        <SignOutButton label={t.chrome.signOut} className={`hidden lg:block ${ghostButton}`} />
      </>
    );
  }

  return (
    <>
      <Link href="/dashboard" className={sunButton}>
        {t.chrome.dashboard}
      </Link>
      <SignOutButton label={t.chrome.signOut} className={`hidden lg:block ${ghostButton}`} />
    </>
  );
}

/** "Seasonal Plan" — leaders and staff only. Sits beside "Our History". */
async function LeaderNavLink({ mobile = false }: { mobile?: boolean }) {
  const profile = await getCurrentProfile();
  const t = await getT();
  if (!profile || !isStaffRole(profile.role)) return null;
  return mobile ? (
    <Link href="/seasonal-plan" className={menuLink}>
      {t.chrome.nav.seasonalPlan}
    </Link>
  ) : (
    <NavLink href="/seasonal-plan" className={navLink}>
      {t.chrome.nav.seasonalPlan}
    </NavLink>
  );
}

/** Members-area links, for the desktop nav. Nothing for signed-out visitors. */
async function StaffLinks() {
  const profile = await getCurrentProfile();
  const t = await getT();
  if (!profile) return null;
  return (
    <>
      {isStageRole(profile.role) ? (
        <NavLink href="/dashboard/stage" className={navLink}>
          {t.chrome.nav.stage}
        </NavLink>
      ) : null}
      {isSiteAdminRole(profile.role) ? (
        <NavLink href="/members" className={navLink}>
          {t.chrome.nav.members}
        </NavLink>
      ) : null}
    </>
  );
}

/** The same, plus sign-in / sign-out, for the mobile menu. */
async function MenuAuth() {
  const profile = await getCurrentProfile();
  const t = await getT();

  if (!profile) {
    return (
      <Link href="/login" className={menuLink}>
        {t.chrome.logIn}
      </Link>
    );
  }

  if (isPendingRole(profile.role)) {
    return (
      <>
        <Link href="/pending" className={menuLink}>
          {t.chrome.requestStatus}
        </Link>
        <SignOutButton label={t.chrome.signOut} className={menuLink} />
      </>
    );
  }

  return (
    <>
      <Link href="/dashboard" className={menuLink}>
        {t.chrome.dashboard}
      </Link>
      {isStageRole(profile.role) ? (
        <Link href="/dashboard/stage" className={menuLink}>
          {t.chrome.nav.stage}
        </Link>
      ) : null}
      {isSiteAdminRole(profile.role) ? (
        <Link href="/members" className={menuLink}>
          {t.chrome.nav.members}
        </Link>
      ) : null}
      <SignOutButton label={t.chrome.signOut} className={menuLink} />
    </>
  );
}

function SignOutButton({ className, label }: { className: string; label: string }) {
  return (
    <form action={signOutAction} className="contents">
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}

/** Reserves the button's space so the bar doesn't jump when auth resolves. */
function AuthPlaceholder() {
  return <div aria-hidden className="h-11 w-24 rounded-md bg-white/10" />;
}

export async function SiteHeader() {
  const t = await getT();
  const before = navBefore(t);
  const after = navAfter(t);
  return (
    <header className="header-lift on-dark sticky top-0 z-50 w-full bg-forest">
      {/* Keyboard and screen-reader users can jump the navigation entirely.
          Visible only when focused. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-3 focus:z-50
                   focus:rounded-md focus:bg-sun focus:px-4 focus:py-2
                   focus:text-sm focus:font-bold focus:text-forest"
      >
        {t.chrome.skipToContent}
      </a>

      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between gap-2 px-3 min-[380px]:px-5 sm:gap-4 sm:px-8">
        <BrandLogo />

        <div className="flex items-center gap-2 sm:gap-4 lg:gap-3 xl:gap-4">
          <nav aria-label={t.chrome.nav.main} className="hidden items-center gap-2.5 lg:flex xl:gap-5">
            {before.map((item) => (
              <NavLink key={item.href} href={item.href} className={navLink}>
                {item.label}
              </NavLink>
            ))}
            <Suspense fallback={null}>
              <LeaderNavLink />
            </Suspense>
            {after.map((item) => (
              <NavLink key={item.href} href={item.href} className={navLink}>
                {item.label}
              </NavLink>
            ))}
            <Suspense fallback={null}>
              <StaffLinks />
            </Suspense>
          </nav>

          <LanguageSwitch compact className="hidden sm:inline-flex" />

          <Suspense fallback={<AuthPlaceholder />}>
            <HeaderAuth />
          </Suspense>

          <MobileMenu>
            {before.map((item) => (
              <Link key={item.href} href={item.href} className={menuLink}>
                {item.label}
              </Link>
            ))}
            <Suspense fallback={null}>
              <LeaderNavLink mobile />
            </Suspense>
            {after.map((item) => (
              <Link key={item.href} href={item.href} className={menuLink}>
                {item.label}
              </Link>
            ))}
            <Suspense fallback={null}>
              <MenuAuth />
            </Suspense>
            <LanguageSwitch className={`${menuLink} mt-2 border-t border-cream/15 pt-4`} />
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
