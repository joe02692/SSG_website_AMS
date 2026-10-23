import { EventComingSoon } from "@/components/event-coming-soon";
import { getLocale, getT } from "@/lib/i18n/server";
import { getPublicEvent } from "@/lib/site-event";

/**
 * The event countdown, if the head site admin has switched one on (/admin).
 * Renders nothing when it's off, already started, or can't be read.
 */
export async function SiteEvent() {
  const locale = await getLocale();
  const event = await getPublicEvent(locale);
  if (!event) return null;
  const t = (await getT()).chrome.event;
  return (
    <EventComingSoon
      title={event.title || t.defaultTitle}
      description={event.description}
      startsAt={event.startsAt}
      labels={{
        region: t.region,
        days: t.days,
        hours: t.hours,
        mins: t.mins,
        collapse: t.collapse,
        expand: t.expand,
        badge: t.badge,
      }}
    />
  );
}
