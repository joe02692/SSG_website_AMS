import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { CONTACT, FOUNDED } from "@/lib/site-content";
import { FacebookIcon, InstagramIcon, PhoneIcon } from "@/components/landing/contact-icons";
import { getT } from "@/lib/i18n/server";

const linkClass = "text-cream/80 transition hover:text-sun";

export async function SiteFooter() {
  const t = await getT();
  const f = t.chrome.footer;
  const explore = [
    { href: "/history", label: f.ourHistory },
    { href: "/stages", label: f.ourStages },
    { href: "/gallery", label: f.campGallery },
    { href: "/signup", label: f.joinUs },
    { href: "/#contact", label: f.contactUs },
  ];
  const members = [
    { href: "/login", label: f.logIn },
    { href: "/dashboard", label: f.dashboard },
    { href: "/forgot-password", label: f.forgotPassword },
  ];
  return (
    <footer className="on-dark mt-auto bg-forest text-cream">
      {/* A strip of the group's yellow, like the edge of a neckerchief. */}
      <div aria-hidden className="h-1.5 bg-sun" />
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-6 gap-y-10 px-5 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="col-span-2 md:col-span-1">
          <BrandLogo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream/80">
            {f.blurb(FOUNDED)}
          </p>
        </div>

        <nav aria-labelledby="footer-explore">
          <h2 id="footer-explore" className="text-base text-sun">
            {f.explore}
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {explore.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-members">
          <h2 id="footer-members" className="text-base text-sun">
            {f.members}
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {members.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="col-span-2 md:col-span-1">
          <h2 className="text-base text-sun">{f.contact}</h2>
          <ul className="mt-3 space-y-2.5 text-sm">
            <li>
              <a href={CONTACT.phoneHref} className={`${linkClass} inline-flex items-center gap-2`}>
                <PhoneIcon className="size-4" />
                <span dir="ltr">{CONTACT.phoneDisplay}</span>
              </a>
            </li>
            <li>
              <a href={CONTACT.instagram.url} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex items-center gap-2`}>
                <InstagramIcon className="size-4" />
                {f.instagram}<span className="sr-only">{t.chrome.opensNewTab}</span>
              </a>
            </li>
            <li>
              <a href={CONTACT.facebook.url} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex items-center gap-2`}>
                <FacebookIcon className="size-4" />
                {f.facebook}<span className="sr-only">{t.chrome.opensNewTab}</span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-cream/15">
        <p className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-2 px-5 py-4 text-xs text-cream/70 sm:px-8">
          <span>{f.copyright(new Date().getFullYear())}</span>
          <span className="font-display">{f.motto}</span>
        </p>
      </div>
    </footer>
  );
}
