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
 */
import type { StaticImageData } from "next/image";

import hero1 from "@/public/images/hero-1.jpg";
import hero2 from "@/public/images/hero-2.jpg";
import hero3 from "@/public/images/hero-3.jpg";
import activity1 from "@/public/images/activity-1.jpg";
import activity2 from "@/public/images/activity-2.jpg";
import activity3 from "@/public/images/activity-3.jpg";
import activity4 from "@/public/images/activity-4.jpg";
import activity5 from "@/public/images/activity-5.jpg";
import activity6 from "@/public/images/activity-6.jpg";

export const FOUNDED = 1977;

export type Photo = { src: StaticImageData; alt: string };
export type Album = Photo & { name: string };

export const HERO_SLIDES: Photo[] = [
  { src: hero1, alt: "Hundreds of El-Salam scouts, leaders and families waving in a group photo by the sea" },
  { src: hero2, alt: "Scouts sitting in a circle on the grass during a patrol meeting" },
  { src: hero3, alt: "A scout and a leader tying a neckerchief together on the lawn" },
];

export const STATS = [
  { value: "400+", label: "Active Members" },
  { value: "50+", label: "Camps" },
];

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
  { src: hero3, name: "Neckerchief Ceremony", alt: HERO_SLIDES[2].alt },
  { src: hero2, name: "Patrol Circle", alt: HERO_SLIDES[1].alt },
  ...ACTIVITIES,
];
