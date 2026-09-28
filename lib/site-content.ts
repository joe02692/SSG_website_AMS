/**
 * Everything the public pages SAY, in one place.
 *
 * So that correcting a date or renaming a photo is a one-line edit here
 * instead of a hunt through JSX. Photos are static imports, which lets
 * next/image read their real dimensions at build time and generate the
 * right-sized WebP/AVIF for each screen.
 *
 * ⚠️ PLACEHOLDER CONTENT — confirm with the group before launch:
 *   • the member / camp figures in STATS
 *   • every milestone except 1977 and 2026
 *   • the photo captions in ACTIVITIES — these describe what is visible in
 *     each picture; they are not the real names of those trips or events.
 *   • the one-line descriptions under each of the three VALUES.
 */
import type { StaticImageData } from "next/image";
import { SCOUT_STAGES } from "@/lib/onboarding";

import hero1 from "@/public/images/hero-1.jpg";
import hero2 from "@/public/images/hero-2.jpg";
import hero3 from "@/public/images/hero-3.jpg";
import slide01 from "@/public/images/slide-01.jpg";
import slide02 from "@/public/images/slide-02.jpg";
import slide03 from "@/public/images/slide-03.jpg";
import slide04 from "@/public/images/slide-04.jpg";
import slide05 from "@/public/images/slide-05.jpg";
import slide06 from "@/public/images/slide-06.jpg";
import slide07 from "@/public/images/slide-07.jpg";
import slide08 from "@/public/images/slide-08.jpg";
import slide09 from "@/public/images/slide-09.jpg";
import slide10 from "@/public/images/slide-10.jpg";
import slide11 from "@/public/images/slide-11.jpg";
import slide12 from "@/public/images/slide-12.jpg";
import activity1 from "@/public/images/activity-1.jpg";
import activity2 from "@/public/images/activity-2.jpg";
import activity3 from "@/public/images/activity-3.jpg";
import activity4 from "@/public/images/activity-4.jpg";
import activity5 from "@/public/images/activity-5.jpg";
import activity6 from "@/public/images/activity-6.jpg";

export const FOUNDED = 1977;

export type Photo = { src: StaticImageData; alt: string };
export type Album = Photo & { name: string };

/** The big group photo by the sea — used beside the sign-in forms. */
export const GROUP_PHOTO: Photo = {
  src: hero1,
  alt: "Hundreds of El-Salam scouts, leaders and families waving in a group photo by the sea",
};

/** A homepage slide: the photo, plus the caption shown in the bar under it. */
export type HeroSlide = Photo & {
  /** Short tag above the caption, e.g. "Cubs". */
  label: string;
  /** One line about the moment. Cut to two lines on screen. */
  title: string;
  /** CSS object-position — which part of the photo to keep when the hero is
   *  wider than the photo. Default "50% 35%". */
  focus?: string;
};

/**
 * The homepage slideshow, in the order it plays. Chosen by the group (28 Sep
 * 2026) from the "٣٠ صورة website" Drive folder. Each was turned upright,
 * resized to 2000px and had its EXIF data — including any GPS position —
 * removed before being added here.
 *
 * ⚠️ The labels and titles describe what is visible in each photo. Swap in
 * the real event names whenever the group has them.
 */
export const HERO_SLIDES: HeroSlide[] = [
  { src: slide01, label: "Guides", title: "Standing proud in maroon and white", alt: "Guides in white shirts and maroon neckerchiefs posing together in front of a wooden pole structure" },
  { src: slide02, label: "Cubs", title: "A whole lawn full of grins", alt: "A crowd of young cubs and their leaders grinning at the camera on a sunny lawn" },
  { src: slide03, label: "Guides", title: "Friends by the sea", alt: "Guides with their arms around each other, laughing, with the sea behind them" },
  { src: slide04, focus: "50% 25%", label: "Games", title: "Mid-air on the palm terrace", alt: "Scouts caught mid-jump in a game on a stone terrace lined with palm trees" },
  { src: slide05, label: "Cubs", title: "The neckerchief grab game", alt: "A leader holds out a neckerchief as two young cubs reach for it in a game on the grass" },
  { src: slide06, focus: "50% 25%", label: "Guides", title: "Jumping for joy", alt: "A guide leaps into the air, arms up, while her friends clap along" },
  { src: slide07, label: "Leaders", title: "Afternoons under the trees", alt: "Leaders and young cubs laughing together under the trees in the late-afternoon sun" },
  { src: slide08, label: "Summer", title: "Water games on hot days", alt: "A leader pours water over a laughing group of cubs during a summer game" },
  { src: slide09, label: "Patrols", title: "Patrol circle on the grass", alt: "Young guides sitting in a circle on the grass for a patrol meeting" },
  { src: slide10, focus: "50% 15%", label: "Leaders", title: "The team behind it all", alt: "Young leaders posing as a team under a tree, one sitting on another's shoulders" },
  { src: slide11, label: "Cubs", title: "Best friends, matching bracelets", alt: "Two young cubs hugging and showing off matching bead bracelets" },
  { src: slide12, label: "Seniors", title: "Golden hour on the garden wall", alt: "Senior guides sitting together along a garden wall at golden hour" },
];

export const STATS = [
  { value: "400+", label: "Active Members" },
  { value: "50+", label: "Camps" },
  // Counted from the registration form's list, so it can't drift from it.
  { value: String(SCOUT_STAGES.length), label: "Stages" },
  { value: String(FOUNDED), label: "Founded" },
];

/** The three words of the tagline, each with a line of what it means. */
export const VALUES = [
  {
    title: "Character",
    body: "Keeping a promise, owning a mistake, leading a patrol — confidence built one camp at a time.",
    icon: "compass",
  },
  {
    title: "Service",
    body: "Clean-ups, charity drives and helping at community events. Scouts learn that a good turn is a habit.",
    icon: "hands",
  },
  {
    title: "Friendship",
    body: "Patrols, campfires and trips that turn classmates into friends for life — across every age group.",
    icon: "tent",
  },
] as const;

/**
 * The stages, split into their English and Arabic names. Taken straight from
 * the list the registration form and the database use.
 *
 * ⚠️ The group has not settled this list yet (7 English names in the DBMS
 * handoff vs these 8). Whatever it becomes, this section follows it.
 */
export const STAGES = SCOUT_STAGES.map((stage) => {
  const [en, ar] = stage.label.split(" — ");
  return { value: stage.value, en, ar };
});

export type MilestoneIcon = "sprout" | "house" | "people" | "laptop";

/** Group milestones on the History page's rope. ⚠️ Only 1977 and 2026 are
 *  confirmed — the others are placeholders until the group checks them. */
export const MILESTONES: {
  year: number;
  title: string;
  body: string;
  icon: MilestoneIcon;
}[] = [
  {
    year: FOUNDED,
    title: "The First Troop",
    body: "El-Salam begins with a single troop of twenty scouts meeting in a borrowed hall, led by volunteers from the neighbourhood.",
    icon: "sprout",
  },
  {
    year: 1985,
    title: "A Permanent Home",
    body: "The group opens its own scout house, giving every section a place to store kit and plan expeditions year-round.",
    icon: "house",
  },
  {
    year: 2004,
    title: "Growing",
    body: "Cubs and Rovers are added alongside the original troop, opening the group to a much wider range of ages.",
    icon: "people",
  },
  {
    year: 2026,
    title: "Going Digital",
    body: "Records move off spreadsheets and paper into a single membership system, so leaders spend their time on scouting rather than admin.",
    icon: "laptop",
  },
];

export type Camp = {
  year: number;
  season: "Winter" | "Summer";
  place: string;
  placeAr: string;
  /** The Cloudinary album this camp's photos live in. Built exactly the way
   *  scripts/upload-gallery.mjs builds it: slugify("Summer Camp 2018 — Marsa Alam"). */
  slug: string;
};

const camp = (year: number, season: Camp["season"], place: string, placeAr: string): Camp => ({
  year,
  season,
  place,
  placeAr,
  slug: `${season} camp ${year} ${place}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, ""),
});

/**
 * Every camp folder in the group's Drive ("معسكرات ٢٠١٨ إلى ٢٠٢٦"), oldest
 * first — including the ones with no photos yet. A camp shows its photos on
 * the History page as soon as its album exists in Cloudinary; to add one,
 * put the photos in its Drive folder and run the upload script again.
 */
export const CAMPS: Camp[] = [
  camp(2018, "Winter", "Luxor & Aswan", "الأقصر وأسوان"),
  camp(2018, "Summer", "Marsa Alam", "مرسى علم"),
  camp(2019, "Winter", "The Oases", "الواحات"),
  camp(2019, "Summer", "South Sinai", "جنوب سيناء"),
  camp(2020, "Winter", "Port Said", "بورسعيد"),
  camp(2021, "Summer", "Marsa Matrouh", "مرسى مطروح"),
  camp(2022, "Winter", "Siwa", "سيوة"),
  camp(2022, "Summer", "Sinai", "سيناء"),
  camp(2023, "Winter", "Luxor & Aswan", "الأقصر وأسوان"),
  camp(2023, "Summer", "Marsa Alam", "مرسى علم"),
  camp(2024, "Winter", "The Oases", "الواحات"),
  camp(2024, "Summer", "Marsa Matrouh", "مرسى مطروح"),
  camp(2025, "Winter", "Siwa", "سيوة"),
  camp(2025, "Summer", "Hurghada", "الغردقة"),
  camp(2026, "Winter", "Luxor & Aswan", "الأقصر وأسوان"),
  camp(2026, "Summer", "Marsa Matrouh", "مرسى مطروح"),
];

/** The six photos in the green band on the homepage. */
export const ACTIVITIES: Album[] = [
  { src: activity1, name: "Songs & Games", alt: "A leader leading cubs in a song with his arms spread wide" },
  { src: activity2, name: "Guides' Day Out", alt: "Guides in white shirts and neckerchiefs posing together in a park" },
  { src: activity3, name: "Water Park", alt: "Two scouts peeking through a yellow double swim ring" },
  { src: activity4, name: "Seaside Hike", alt: "Scouts and leaders standing on rocks at the edge of a blue sea" },
  { src: activity5, name: "Ancient Sites", alt: "Scouts gathered in front of a stone temple gateway, two standing on top of the wall" },
  { src: activity6, name: "Train Museum", alt: "Guides in front of a green vintage railway carriage" },
];

/** Camp Gallery page: the designer's eight photos, one card each. */
export const GALLERY: Album[] = [
  { src: hero3, name: "Neckerchief Ceremony", alt: "A scout and a leader tying a neckerchief together on the lawn" },
  { src: hero2, name: "Patrol Circle", alt: "Scouts sitting in a circle on the grass during a patrol meeting" },
  ...ACTIVITIES,
];
