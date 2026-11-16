import Image from "next/image";
import type { SiteEvent } from "@/lib/events";
import { EVENTS_TIMEZONE } from "@/lib/events";
import type { Dictionary } from "@/lib/i18n/dictionaries";

/**
 * Event cards for the public /events page. `featured` is the big "next
 * event" card at the top; the rest are the grid below it.
 *
 * Times are shown in Cairo time, whatever the visitor's own clock says.
 */

type Strings = Dictionary["features"]["events"];

function parts(iso: string, locale: string) {
  const at = new Date(iso);
  const fmt = (o: Intl.DateTimeFormatOptions) => at.toLocaleString(locale, { timeZone: EVENTS_TIMEZONE, ...o });
  return {
    day: fmt({ day: "numeric" }),
    month: fmt({ month: "short" }),
    weekday: fmt({ weekday: "long" }),
    date: fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    time: fmt({ hour: "numeric", minute: "2-digit" }),
    dayKey: fmt({ year: "numeric", month: "2-digit", day: "2-digit" }),
  };
}

/** "Saturday 21 November 2026 · 9:00 am – 5:00 pm" (or across days). */
export function eventWhen(event: SiteEvent, locale: string): string {
  const start = parts(event.startsAt, locale);
  if (!event.endsAt) return `${start.date} · ${start.time}`;
  const end = parts(event.endsAt, locale);
  return start.dayKey === end.dayKey
    ? `${start.date} · ${start.time} – ${end.time}`
    : `${start.date} ${start.time} – ${end.date} ${end.time}`;
}

/** Whole days until the event starts (0 = today / under a day). */
function daysUntil(iso: string, now: number): number {
  return Math.max(0, Math.floor((new Date(iso).getTime() - now) / 86_400_000));
}

function DateBadge({ iso, locale, large = false }: { iso: string; locale: string; large?: boolean }) {
  const p = parts(iso, locale);
  return (
    <span
      className={`flex flex-col items-center justify-center rounded-xl bg-sun text-forest shadow-md ${
        large ? "size-20" : "size-16"
      }`}
    >
      <span className={`font-display font-bold leading-none tabular-nums ${large ? "text-3xl" : "text-2xl"}`}>{p.day}</span>
      <span className="mt-1 text-xs font-bold uppercase tracking-wider">{p.month}</span>
    </span>
  );
}

function PinIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 18s6-5.2 6-10A6 6 0 0 0 4 8c0 4.8 6 10 6 10Z" />
      <circle cx="10" cy="8" r="2.2" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 6v4.2l2.8 1.8" />
    </svg>
  );
}

/** A plain forest panel with the scout fleur, for events without a photo. */
function NoPhoto() {
  return (
    <div aria-hidden className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_20%,var(--color-leaf),var(--color-forest)_70%)]">
      <svg viewBox="0 0 64 64" className="size-16 text-sun/80" fill="currentColor">
        <path d="M32 4c-3 6-8 10-8 18 0 5 3 9 8 12 5-3 8-7 8-12 0-8-5-12-8-18Zm-14 20c-6 0-10 4-10 9 0 4 3 7 7 7 3 0 6-2 8-5-3-3-5-7-5-11Zm28 0c0 4-2 8-5 11 2 3 5 5 8 5 4 0 7-3 7-7 0-5-4-9-10-9ZM26 38h12v4H26zM29 44h6l-3 16z" />
      </svg>
    </div>
  );
}

export function FeaturedEvent({ event, locale, t, now }: { event: SiteEvent; locale: string; t: Strings; now: number }) {
  const days = daysUntil(event.startsAt, now);
  const started = new Date(event.startsAt).getTime() <= now;
  return (
    <article className="reveal overflow-hidden rounded-3xl border-2 border-line bg-surface-raised shadow-sm md:grid md:grid-cols-[1.1fr_1fr]">
      <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[320px]">
        {event.photo ? (
          <Image src={event.photo} alt="" fill unoptimized preload fetchPriority="high" sizes="(min-width: 768px) 55vw, 100vw" className="object-cover" />
        ) : (
          <NoPhoto />
        )}
        <span className="absolute start-4 top-4">
          <DateBadge iso={event.startsAt} locale={locale} large />
        </span>
      </div>
      <div className="flex flex-col gap-3 p-6 sm:p-8">
        <p className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-forest px-3 py-1 text-xs font-bold uppercase tracking-wider text-sun">{t.nextUp}</span>
          <span className="rounded-full border border-leaf px-3 py-1 text-xs font-bold text-forest">
            {started ? t.happeningNow : t.inDays(days)}
          </span>
        </p>
        <h2 className="text-[clamp(24px,3.5vw,32px)] leading-tight text-maroon">
          <bdi>{event.title}</bdi>
        </h2>
        <p className="flex items-start gap-2 text-sm font-semibold text-ink">
          <ClockIcon />
          <span>{eventWhen(event, locale)}</span>
        </p>
        {event.location ? (
          <p className="flex items-start gap-2 text-sm text-ink-muted">
            <PinIcon />
            <bdi>{event.location}</bdi>
          </p>
        ) : null}
        {event.description ? (
          <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-ink">
            <bdi>{event.description}</bdi>
          </p>
        ) : null}
      </div>
    </article>
  );
}

export function EventCard({ event, locale, t, now }: { event: SiteEvent; locale: string; t: Strings; now: number }) {
  const days = daysUntil(event.startsAt, now);
  return (
    <article className="reveal flex flex-col overflow-hidden rounded-2xl border-2 border-line bg-surface-raised transition hover:-translate-y-0.5 hover:border-leaf hover:shadow-md">
      <div className="relative aspect-[16/9]">
        {event.photo ? (
          <Image src={event.photo} alt="" fill unoptimized sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
        ) : (
          <NoPhoto />
        )}
        <span className="absolute start-3 top-3">
          <DateBadge iso={event.startsAt} locale={locale} />
        </span>
        <span className="absolute end-3 top-3 rounded-full bg-forest/90 px-2.5 py-1 text-xs font-bold text-cream">
          {t.inDays(days)}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-xl leading-snug text-forest">
          <bdi>{event.title}</bdi>
        </h3>
        <p className="flex items-start gap-2 text-sm text-ink">
          <ClockIcon />
          <span>{eventWhen(event, locale)}</span>
        </p>
        {event.location ? (
          <p className="flex items-start gap-2 text-sm text-ink-muted">
            <PinIcon />
            <bdi>{event.location}</bdi>
          </p>
        ) : null}
        {event.description ? (
          <p className="mt-1 line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
            <bdi>{event.description}</bdi>
          </p>
        ) : null}
      </div>
    </article>
  );
}
