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

/**
 * The homepage slideshow, in the order it plays. Chosen by the group (28 Sep
 * 2026) from the "٣٠ صورة website" Drive folder. Each was turned upright,
 * resized to 2000px and had its EXIF data — including any GPS position —
 * removed before being added here.
 */
export const HERO_SLIDES: Photo[] = [
  { src: slide01, alt: "Guides in white shirts and maroon neckerchiefs posing together in front of a wooden pole structure" },
  { src: slide02, alt: "A crowd of young cubs and their leaders grinning at the camera on a sunny lawn" },
  { src: slide03, alt: "Guides with their arms around each other, laughing, with the sea behind them" },
  { src: slide04, alt: "Scouts caught mid-jump in a game on a stone terrace lined with palm trees" },
  { src: slide05, alt: "A leader holds out a neckerchief as two young cubs reach for it in a game on the grass" },
  { src: slide06, alt: "A guide leaps into the air, arms up, while her friends clap along" },
  { src: slide07, alt: "Leaders and young cubs laughing together under the trees in the late-afternoon sun" },
  { src: slide08, alt: "A leader pours water over a laughing group of cubs during a summer game" },
  { src: slide09, alt: "Young guides sitting in a circle on the grass for a patrol meeting" },
  { src: slide10, alt: "Young leaders posing as a team under a tree, one sitting on another's shoulders" },
  { src: slide11, alt: "Two young cubs hugging and showing off matching bead bracelets" },
  { src: slide12, alt: "Senior guides sitting together along a garden wall at golden hour" },
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

export const MILESTONES = [
  {
    year: String(FOUNDED),
    title: "The First Troop",
    body: "El-Salam begins with a single troop of twenty scouts meeting in a borrowed hall, led by volunteers from the neighbourhood.",
  },
  {
    year: "1985",
    title: "A Permanent Home",
    body: "The group opens its own scout house, giving every section a place to store kit and plan expeditions year-round.",
  },
  {
    year: "2004",
    title: "Growing",
    body: "Cubs and Rovers are added alongside the original troop, opening the group to a much wider range of ages.",
  },
  {
    year: "2026",
    title: "Going Digital",
    body: "Records move off spreadsheets and paper into a single membership system, so leaders spend their time on scouting rather than admin.",
  },
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
