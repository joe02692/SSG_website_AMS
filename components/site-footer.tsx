import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { FOUNDED } from "@/lib/site-content";

const EXPLORE = [
  { href: "/#history", label: "Our History" },
  { href: "/gallery", label: "Camp Gallery" },
  { href: "/#stages", label: "Our Stages" },
  { href: "/signup", label: "Join Us" },
];

const MEMBERS = [
  { href: "/login", label: "Log in" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/forgot-password", label: "Forgot password" },
];

const linkClass = "text-cream/80 transition hover:text-sun";

export function SiteFooter() {
  return (
    <footer className="on-dark mt-auto bg-forest text-cream">
      {/* A strip of the group's yellow, like the edge of a neckerchief. */}
      <div aria-hidden className="h-1.5 bg-sun" />
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-6 gap-y-10 px-5 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="col-span-2 md:col-span-1">
          <BrandLogo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream/80">
            Character, service and friendship — scouting in the same
            neighbourhood since {FOUNDED}.
          </p>
        </div>

        <nav aria-labelledby="footer-explore">
          <h2 id="footer-explore" className="text-lg text-sun">
            Explore
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {EXPLORE.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-members">
          <h2 id="footer-members" className="text-lg text-sun">
            Members
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {MEMBERS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-cream/15">
        <p className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-2 px-5 py-4 text-xs text-cream/70 sm:px-8">
          <span>© {new Date().getFullYear()} El-Salam Scouting Group</span>
          <span lang="ar" dir="rtl" className="font-display">
            كن مستعدًا
          </span>
        </p>
      </div>
    </footer>
  );
}
