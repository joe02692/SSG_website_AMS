import Link from "next/link";
import { getCurrentProfile } from "@/lib/dal";
import { ROLE_LABELS } from "@/lib/roles";
import { signOutAction } from "@/app/auth/actions";

const NAV = [
  { href: "/#history", label: "Our history" },
  { href: "/gallery", label: "Camp gallery" },
  { href: "/#join", label: "Join us" },
];

export async function SiteHeader() {
  const profile = await getCurrentProfile();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3.5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
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

        <nav
          aria-label="Main"
          className="ml-auto hidden items-center gap-6 md:flex"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-ink-muted transition hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 md:ml-0">
          {profile ? (
            <>
              <span className="hidden text-right text-xs leading-tight sm:block">
                <span className="block font-medium text-ink">
                  {profile.full_name ?? "Member"}
                </span>
                <span className="block text-ink-subtle">
                  {ROLE_LABELS[profile.role]}
                </span>
              </span>
              {profile.role === "leader" ? (
                <>
                  <Link
                    href="/dashboard/stage"
                    className="hidden text-sm font-medium text-ink-muted transition hover:text-ink sm:block"
                  >
                    Stage
                  </Link>
                  <Link
                    href="/members"
                    className="hidden text-sm font-medium text-ink-muted transition hover:text-ink sm:block"
                  >
                    Members
                  </Link>
                </>
              ) : null}
              <Link
                href="/dashboard"
                className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Dashboard
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-lg border border-line px-3 py-2 text-sm text-ink-muted transition hover:text-ink"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-ink-muted transition hover:text-ink"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Join us
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
