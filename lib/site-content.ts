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
 * 2026) from the group's Drive folder of website photos. Each was turned upright,
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
  { value: "4", label: "Branches" },
  { value: "3", label: "Cities" },
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
 * The stages, by their English names. Taken straight from
 * the list the registration form and the database use.
 *
 * ⚠️ The group has not settled this list yet (7 English names in the DBMS
 * handoff vs these 8). Whatever it becomes, this section follows it.
 */
export const STAGES = SCOUT_STAGES.map((stage) => ({
  value: stage.value,
  en: stage.label,
}));

export type MilestoneIcon = "sprout" | "house" | "people" | "laptop";

/** Group milestones on the History page's rope.
 *  1977: the group's own statement (its earlier site: "since 1977").
 *  The 1985 and 2004 placeholders were removed on 29 Sep 2026 — no source
 *  could confirm them. Add the Al Rehab branch here once its year is known. */
export const MILESTONES: {
  year: number;
  title: string;
  body: string;
  icon: MilestoneIcon;
}[] = [
  {
    year: FOUNDED,
    title: "Founded in Tanta",
    body: "El-Salam Scout Group is founded in Tanta — still the group's oldest home — and sets out to spread Scouting well beyond one city.",
    icon: "sprout",
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
  /** The Cloudinary album this camp's photos live in. Built exactly the way
   *  scripts/upload-gallery.mjs builds it: slugify("Summer Camp 2018 — Marsa Alam"). */
  slug: string;
};

const camp = (year: number, season: Camp["season"], place: string): Camp => ({
  year,
  season,
  place,
  slug: `${season} camp ${year} ${place}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, ""),
});

/**
 * Every camp folder in the group's Drive (camps 2018–2026), oldest
 * first — including the ones with no photos yet. A camp shows its photos on
 * the History page as soon as its album exists in Cloudinary; to add one,
 * put the photos in its Drive folder and run the upload script again.
 */
export const CAMPS: Camp[] = [
  camp(2018, "Winter", "Luxor & Aswan"),
  camp(2018, "Summer", "Marsa Alam"),
  camp(2019, "Winter", "The Oases"),
  camp(2019, "Summer", "South Sinai"),
  camp(2020, "Winter", "Port Said"),
  camp(2021, "Summer", "Marsa Matrouh"),
  camp(2022, "Winter", "Siwa"),
  camp(2022, "Summer", "Sinai"),
  camp(2023, "Winter", "Luxor & Aswan"),
  camp(2023, "Summer", "Marsa Alam"),
  camp(2024, "Winter", "The Oases"),
  camp(2024, "Summer", "Marsa Matrouh"),
  camp(2025, "Winter", "Siwa"),
  camp(2025, "Summer", "Hurghada"),
  camp(2026, "Winter", "Luxor & Aswan"),
  camp(2026, "Summer", "Marsa Matrouh"),
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

// ---------------------------------------------------------------------------
// About us · Our goals · About scouting
//
// Rewritten in English from the group's earlier site
// (elsalam-scout-group.site123.me, Arabic). The group's own statements are
// kept as the group made them; the facts about world and Egyptian Scouting
// were checked against WOSM and corrected where the old site was out of date.
// ---------------------------------------------------------------------------

/** Where the group meets. From the old site's "Branches" section. */
export const BRANCHES = [
  { name: "Tanta Sports Club", city: "Tanta", note: "Our oldest home" },
  { name: "Tanta Teachers Club", city: "Tanta" },
  { name: "Al Rehab Sports Club", city: "Al Rehab" },
  { name: "Madinaty Sports Club", city: "Madinaty" },
];

export const ABOUT_POINTS = [
  "Gharbia's leading scout group, under the Egyptian Federation for Scouts and Girl Guides.",
  "Present in sports clubs, youth centres and both public and private schools.",
  "Teams that have represented Egypt at scout events at home and around the world.",
];

export type GoalIcon = "citizen" | "talent" | "globe" | "tent" | "friends" | "service";

/** "Our Goals", from the old site, reworded. */
export const GOALS: { title: string; body: string; icon: GoalIcon }[] = [
  {
    title: "Good citizens",
    body: "Raise young people who can look after themselves and serve their community, out of love for their family, their town and their country.",
    icon: "citizen",
  },
  {
    title: "Talent, discovered",
    body: "Find every member's talents, polish them, and give them a stage to shine on.",
    icon: "talent",
  },
  {
    title: "Egypt and the world",
    body: "Help our boys and girls get to know Egypt — and the wider world around it — first-hand.",
    icon: "globe",
  },
  {
    title: "Camps and events",
    body: "Prepare and nominate our members for local and international camps, gatherings and scout events.",
    icon: "tent",
  },
  {
    title: "Lifelong friendships",
    body: "Build friendships between members — and between their families, too.",
    icon: "friends",
  },
  {
    title: "A habit of service",
    body: "Make community service part of everyday life, and put it into practice.",
    icon: "service",
  },
];

/** The fixed points of every season, shared by all branches. */
export const SEASON = [
  { when: "Start of season", title: "Opening ceremony", where: "Indoor" },
  { when: "Mid-year holiday", title: "Winter camp", where: "Away" },
  { when: "End of the school year", title: "Summer camp", where: "Away" },
  { when: "End of season", title: "Closing ceremony", where: "Indoor" },
];

/** Beyond the group — "according to each year's plan". */
export const WIDER_SCOUTING = [
  "Activities of the Egyptian Federation for Scouts and Girl Guides",
  "Programmes of the Arab Scout Organization",
  "Committees and projects of the World Scout Bureau",
  "Celebrations and competitions with other scout groups",
];

/**
 * About Scouting. Checked, and corrected from the old site:
 *  - membership: WOSM reports a reach of 60 million young people and
 *    volunteers (Aug 2025), not "over 100 million".
 *  - Egypt: Scouting began here in 1914; Egypt was among the founding
 *    members of the World Organization of the Scout Movement in 1922.
 */
export const SCOUTING_FACTS = [
  { value: "1907", label: "Scouting is founded" },
  { value: "1914", label: "Scouting comes to Egypt" },
  { value: "1922", label: "Egypt helps found the World Organization of the Scout Movement" },
  { value: "60M", label: "Young people and volunteers in Scouting worldwide" },
];
