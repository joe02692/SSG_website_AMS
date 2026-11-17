import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { requireHeadSiteAdmin } from "@/lib/dal";
import { getAllEvents } from "@/lib/events";
import { EVENT_TIMEZONE, isoToCairoLocal } from "@/lib/site-event";
import { publicImageUrl } from "@/lib/public-images";
import { EventsManager, type AdminEvent } from "@/components/admin/events-manager";
import { getLocale, getT } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).features.adminEvents.metaTitle };
}

/** Admin → Events: what the public /events page lists (head site admin only). */
export default async function AdminEventsPage() {
  await requireHeadSiteAdmin();
  const t = (await getT()).features.adminEvents;
  const locale = await getLocale();
  const { rows, missing } = await getAllEvents();
  const now = requestTime();

  const when = (iso: string) =>
    new Date(iso).toLocaleString(intlLocale(locale), {
      timeZone: EVENT_TIMEZONE,
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const events: AdminEvent[] = rows.map((row) => ({
    id: row.id,
    titleAr: row.title_ar,
    titleEn: row.title_en ?? "",
    descriptionAr: row.description_ar ?? "",
    descriptionEn: row.description_en ?? "",
    locationAr: row.location_ar ?? "",
    locationEn: row.location_en ?? "",
    startsAt: isoToCairoLocal(row.starts_at),
    endsAt: isoToCairoLocal(row.ends_at),
    published: row.published,
    pinned: row.pinned === true,
    photo: publicImageUrl(row.photo_key),
    when: when(row.starts_at),
    status: !row.published
      ? "draft"
      : new Date(row.ends_at ?? row.starts_at).getTime() + (row.ends_at ? 0 : 12 * 3600_000) < now
        ? "past"
        : "upcoming",
  }));

  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <Link href="/admin" className="text-sm text-brand-ink underline-offset-4 hover:underline">
          <span aria-hidden className="inline-block rtl:-scale-x-100">←</span> {t.back}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{t.title}</h1>
        <p className="mt-2 text-ink-muted">{t.intro}</p>
        <p className="mt-2 text-sm">
          <Link href="/events" className="font-semibold text-brand-ink underline-offset-4 hover:underline">
            {t.viewPage}
          </Link>
        </p>
        {missing ? (
          <p className="mt-6 rounded-lg border border-warning-line bg-warning-surface px-3 py-2.5 text-sm text-warning-ink">
            {t.missing}
          </p>
        ) : (
          <EventsManager events={events} />
        )}
      </div>
    </SiteShell>
  );
}

/** The time this page is rendered (pages here are rendered per request). */
function requestTime(): number {
  return Date.now();
}
