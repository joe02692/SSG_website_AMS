"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * A header link that knows when it points at the current page: it gets
 * `aria-current="page"` (screen readers announce "current page") and a yellow
 * underline. Hash links like /#history never count as current — they are
 * sections of the homepage, and underlining two links at once reads as a bug.
 */
export function NavLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const current =
    !href.includes("#") &&
    (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`relative ${className} after:absolute after:inset-x-0 after:-bottom-1.5 after:h-[3px] after:origin-left after:rounded-full after:bg-sun after:transition-transform ${
        current ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100"
      }`}
    >
      {children}
    </Link>
  );
}
