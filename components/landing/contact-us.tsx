import { SectionHeading } from "@/components/landing/section-heading";
import { FacebookIcon, InstagramIcon, PhoneIcon } from "@/components/landing/contact-icons";
import { CONTACT } from "@/lib/site-content";
import { getT } from "@/lib/i18n/server";

/** "Contact Us" on the homepage: one big tappable card per way to reach us. */
export async function ContactUs() {
  const all = await getT();
  const t = all.home.contact;
  const cards = [
    {
      href: CONTACT.phoneHref,
      label: t.call,
      value: CONTACT.phoneDisplay,
      valueDir: "ltr" as const,
      hint: t.callHint,
      Icon: PhoneIcon,
      external: false,
    },
    {
      href: CONTACT.instagram.url,
      label: t.instagram,
      value: CONTACT.instagram.handle,
      valueDir: "ltr" as const,
      hint: t.instagramHint,
      Icon: InstagramIcon,
      external: true,
    },
    {
      href: CONTACT.facebook.url,
      label: t.facebook,
      value: t.facebookName,
      valueDir: "auto" as const,
      hint: t.facebookHint,
      Icon: FacebookIcon,
      external: true,
    },
  ];
  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="mx-auto mt-14 w-[calc(100%-40px)] max-w-[1100px] scroll-mt-24"
    >
      <SectionHeading
        id="contact-heading"
        title={t.title}
        subtitle={t.subtitle}
      />
      <ul className="mt-6 grid gap-4 md:grid-cols-3">
        {cards.map(({ href, label, value, valueDir, hint, Icon, external }) => (
          <li key={label}>
            <a
              href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="group flex h-full items-center gap-4 rounded-2xl border-2 border-line bg-surface-raised p-5 transition hover:-translate-y-1 hover:border-leaf hover:shadow-lg"
            >
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-forest text-sun transition group-hover:scale-105">
                <Icon className="size-7" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-brand-ink">{label}</span>
                <span className="block truncate font-display text-lg font-bold text-forest">
                  {/* Isolated so a phone number or @handle keeps its own
                      left-to-right order inside an Arabic sentence. */}
                  <bdi dir={valueDir}>{value}</bdi>
                </span>
                <span className="block text-sm text-ink-muted">
                  {hint}
                  {external ? <span className="sr-only">{all.chrome.opensNewTab}</span> : null}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
