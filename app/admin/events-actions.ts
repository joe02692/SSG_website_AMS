"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/dal";
import { isHeadSiteAdminRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { cairoLocalToIso } from "@/lib/site-event";
import { deletePublicImage, storePublicImage } from "@/lib/public-images";

/**
 * Add, change and remove events on the /events page (migration 0028).
 * Head site admin only — checked here and again by RLS.
 */

export type EventsFormState = {
  notice?: string;
  error?: string;
  field?: "title_ar" | "starts_at" | "ends_at" | "photo";
  /** Set after a new event is saved, so the form can reset itself. */
  savedId?: string;
};

const UUID = /^[0-9a-f-]{36}$/i;
const LIMITS = { title: 120, description: 2000, location: 160 } as const;

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

async function headAdmin() {
  const viewer = await getCurrentProfile();
  return viewer && isHeadSiteAdminRole(viewer.role) ? viewer : null;
}

function done() {
  revalidatePath("/events");
  revalidatePath("/admin");
}

export async function saveEventItemAction(_prev: EventsFormState, formData: FormData): Promise<EventsFormState> {
  const t = (await getT()).features.adminEvents;
  const viewer = await headAdmin();
  if (!viewer) return { error: t.notAllowed };

  const id = text(formData, "id");
  if (id && !UUID.test(id)) return { error: t.notAllowed };

  const titleAr = text(formData, "title_ar");
  const titleEn = text(formData, "title_en");
  const descriptionAr = text(formData, "description_ar");
  const descriptionEn = text(formData, "description_en");
  const locationAr = text(formData, "location_ar");
  const locationEn = text(formData, "location_en");
  if (!titleAr) return { error: t.titleRequired, field: "title_ar" };
  if (
    titleAr.length > LIMITS.title ||
    titleEn.length > LIMITS.title ||
    descriptionAr.length > LIMITS.description ||
    descriptionEn.length > LIMITS.description ||
    locationAr.length > LIMITS.location ||
    locationEn.length > LIMITS.location
  ) {
    return { error: t.tooLong };
  }

  const startsAt = cairoLocalToIso(text(formData, "starts_at"));
  if (!startsAt) return { error: t.badDate, field: "starts_at" };
  const endsRaw = text(formData, "ends_at");
  let endsAt: string | null = null;
  if (endsRaw) {
    endsAt = cairoLocalToIso(endsRaw);
    if (!endsAt) return { error: t.badDate, field: "ends_at" };
    if (new Date(endsAt) <= new Date(startsAt)) return { error: t.endBeforeStart, field: "ends_at" };
  }

  const supabase = await createClient();
  let oldPhoto: string | null = null;
  if (id) {
    const { data } = await supabase.from("events").select("photo_key").eq("id", id).maybeSingle();
    if (!data) return { error: t.gone };
    oldPhoto = (data as { photo_key: string | null }).photo_key;
  }

  // A new photo replaces the old one; "remove" clears it.
  let photoKey: string | null = oldPhoto;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const stored = await storePublicImage(photo, "events");
    if ("error" in stored) {
      return {
        error: stored.error === "too-big" ? t.photoTooBig : stored.error === "not-image" ? t.photoNotImage : t.couldNotSave,
        field: "photo",
      };
    }
    photoKey = stored.key;
  } else if (formData.get("remove_photo") === "on") {
    photoKey = null;
  }

  const row = {
    title_ar: titleAr,
    title_en: titleEn || null,
    description_ar: descriptionAr || null,
    description_en: descriptionEn || null,
    location_ar: locationAr || null,
    location_en: locationEn || null,
    starts_at: startsAt,
    ends_at: endsAt,
    photo_key: photoKey,
    published: formData.get("published") === "on",
    updated_by: viewer.id,
  };
  const pinned = formData.get("pinned") === "on";

  const write = (values: typeof row & { pinned?: boolean }) =>
    id
      ? supabase.from("events").update(values).eq("id", id).select("id").maybeSingle()
      : supabase.from("events").insert({ ...values, created_by: viewer.id }).select("id").maybeSingle();
  let result = await write({ ...row, pinned });
  // Before migration 0031 there is no "pinned" column: save the rest.
  if (result.error?.code === "PGRST204" || result.error?.code === "42703") result = await write(row);

  if (result.error || !result.data) {
    console.error("[events] could not save", result.error);
    // Don't leave a freshly stored photo behind if the row wasn't saved.
    if (photoKey && photoKey !== oldPhoto) await deletePublicImage(photoKey);
    if (result.error?.code === "PGRST205" || result.error?.code === "42P01") return { error: t.missing };
    return { error: t.couldNotSave };
  }
  if (oldPhoto && oldPhoto !== photoKey) await deletePublicImage(oldPhoto);

  done();
  return { notice: id ? t.updated : t.added, savedId: (result.data as { id: string }).id };
}

/** Pins or unpins one event (0031). Pinned events are listed first on /events. */
export async function togglePinEventAction(_prev: EventsFormState, formData: FormData): Promise<EventsFormState> {
  const t = (await getT()).features.adminEvents;
  const viewer = await headAdmin();
  if (!viewer) return { error: t.notAllowed };
  const id = text(formData, "id");
  if (!UUID.test(id)) return { error: t.notAllowed };
  const pinned = formData.get("pinned") === "true";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .update({ pinned, updated_by: viewer.id })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("[events] could not pin", error);
    if (error?.code === "PGRST204" || error?.code === "42703") return { error: t.pinMissing };
    return { error: t.couldNotSave };
  }
  done();
  return { notice: pinned ? t.pinnedDone : t.unpinnedDone };
}

export async function deleteEventItemAction(_prev: EventsFormState, formData: FormData): Promise<EventsFormState> {
  const t = (await getT()).features.adminEvents;
  const viewer = await headAdmin();
  if (!viewer) return { error: t.notAllowed };
  const id = text(formData, "id");
  if (!UUID.test(id)) return { error: t.notAllowed };

  const supabase = await createClient();
  const { data, error } = await supabase.from("events").delete().eq("id", id).select("photo_key").maybeSingle();
  if (error || !data) {
    console.error("[events] could not delete", error);
    return { error: t.couldNotSave };
  }
  await deletePublicImage((data as { photo_key: string | null }).photo_key);
  done();
  return { notice: t.deleted };
}
