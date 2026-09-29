import { SectionHeading } from "@/components/landing/section-heading";
import { FacebookIcon, InstagramIcon, PhoneIcon } from "@/components/landing/contact-icons";
import { CONTACT } from "@/lib/site-content";

const CARDS = [
  {
    href: CONTACT.phoneHref,
    label: "Call us",
    value: CONTACT.phoneDisplay,
    hint: "Questions about joining or stages",
    Icon: PhoneIcon,
    external: false,
  },
  {
    href: CONTACT.instagram.url,
    label: "Instagram",
    value: CONTACT.instagram.handle,
    hint: "Camp photos and news",
    Icon: InstagramIcon,
    external: true,
  },
  {
    href: CONTACT.facebook.url,
    label: "Facebook",
    value: CONTACT.facebook.label,
    hint: "Announcements and events",
    Icon: FacebookIcon,
    external: true,
  },
];

/** "Contact Us" on the homepage: one big tappable card per way to reach us. */
export function ContactUs() {
  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="mx-auto mt-14 w-[calc(100%-40px)] max-w-[1100px] scroll-mt-24"
    >
      <SectionHeading
        id="contact-heading"
        title="Contact Us"
        subtitle="Questions about joining? We'd love to hear from you."
      />
      <ul className="mt-6 grid gap-4 md:grid-cols-3">
        {CARDS.map(({ href, label, value, hint, Icon, external }) => (
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
                <span className="block truncate font-display text-lg font-bold text-forest" dir="ltr">
                  {value}
                </span>
                <span className="block text-sm text-ink-muted">
                  {hint}
                  {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
