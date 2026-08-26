import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="grid size-8 place-items-center rounded-lg bg-brand-700 text-xs font-bold text-white"
            >
              ES
            </span>
            <span className="text-sm font-semibold text-ink">
              El-Salam Scouting Group
            </span>
          </div>
          <p className="max-w-xs text-sm text-ink-muted">
            Building character, service and friendship through scouting.
          </p>
        </div>

        <nav aria-label="Footer" className="space-y-2 text-sm">
          <h2 className="font-semibold text-ink">Explore</h2>
          <ul className="space-y-1.5 text-ink-muted">
            <li>
              <Link href="/#history" className="hover:text-ink">
                Our history
              </Link>
            </li>
            <li>
              <Link href="/gallery" className="hover:text-ink">
                Camp gallery
              </Link>
            </li>
            <li>
              <Link href="/signup" className="hover:text-ink">
                Become a member
              </Link>
            </li>
          </ul>
        </nav>

        <div className="space-y-2 text-sm">
          <h2 className="font-semibold text-ink">Members</h2>
          <ul className="space-y-1.5 text-ink-muted">
            <li>
              <Link href="/login" className="hover:text-ink">
                Sign in
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="hover:text-ink">
                Member dashboard
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-ink-subtle sm:px-6">
          © {new Date().getFullYear()} El-Salam Scouting Group. All rights
          reserved.
        </p>
      </div>
    </footer>
  );
}
