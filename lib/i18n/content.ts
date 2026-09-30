import "server-only";

import type { Locale } from "@/lib/i18n/config";
import {
  ABOUT_POINTS,
  BRANCHES,
  CAMPS,
  GALLERY,
  GOALS,
  HERO_SLIDES,
  HIDDEN_SLIDES,
  MILESTONES,
  SCOUTING_FACTS,
  SEASON,
  STAGES,
  STATS,
  VALUES,
  WIDER_SCOUTING,
  type Camp,
} from "@/lib/site-content";

/**
 * The site's content (lib/site-content.ts) in the visitor's language.
 *
 * English stays where it has always been; the Arabic lives here, in the same
 * order, and each function below swaps it in. A list that grows in
 * site-content.ts but not here falls back to English for the new items rather
 * than breaking — so adding a slide never takes the Arabic site down.
 */

const pick = <T,>(locale: Locale, en: T, ar: T | undefined): T =>
  locale === "ar" && ar !== undefined ? ar : en;

/** The Arabic overrides for one item, or nothing in English. */
const over = <T extends object>(locale: Locale, ar: T | undefined): Partial<T> =>
  locale === "ar" && ar ? ar : {};

// ------------------------------------------------------------------ stages --
const STAGE_AR: Record<string, string> = {
  baraem: "براعم",
  zahrat: "زهرات",
  ashbal: "أشبال",
  morshedat: "مرشدات",
  kashafa: "كشافة",
  motaqademat: "متقدمات",
  motaqadem: "متقدم",
  jawala: "جوالة",
};

export function stageName(code: string | null | undefined, english: string, locale: Locale) {
  return locale === "ar" && code && STAGE_AR[code] ? STAGE_AR[code] : english;
}

export function localizedStages(locale: Locale) {
  return STAGES.map((s) => ({ ...s, name: stageName(s.value, s.en, locale) }));
}

/** Stage names by their English label, for rows read from the database. */
export function stageNameFromEnglish(english: string, locale: Locale) {
  const stage = STAGES.find((s) => s.en === english);
  return stage ? stageName(stage.value, english, locale) : english;
}

// ------------------------------------------------------------ hero slides --
const SLIDES_AR = [
  { label: "المرشدات", title: "بفخرٍ بالعنابي والأبيض", alt: "مرشدات بقمصان بيضاء ومناديل عنابية يقفن معًا أمام منشأة من الأعمدة الخشبية" },
  { label: "الأشبال", title: "حديقة كاملة من الابتسامات", alt: "مجموعة من الأشبال الصغار وقادتهم يبتسمون للكاميرا على عشب مشمس" },
  { label: "المرشدات", title: "أصدقاء على شاطئ البحر", alt: "مرشدات متشابكات الأذرع يضحكن والبحر خلفهن" },
  { label: "ألعاب", title: "قفزة في الهواء على ممشى النخيل", alt: "كشافة في منتصف قفزة أثناء لعبة على ممشى حجري تحفّه أشجار النخيل" },
  { label: "الأشبال", title: "لعبة خطف المنديل", alt: "قائد يمسك منديلًا بينما يمد شبلان صغيران أيديهما لالتقاطه في لعبة على العشب" },
  { label: "المرشدات", title: "قفزة فرح", alt: "مرشدة تقفز في الهواء رافعةً ذراعيها بينما تصفق صديقاتها" },
  { label: "القادة", title: "عصاري تحت الأشجار", alt: "قادة وأشبال صغار يضحكون معًا تحت الأشجار في شمس العصر" },
  { label: "الصيف", title: "ألعاب المياه في الأيام الحارة", alt: "قائد يسكب الماء على مجموعة من الأشبال الضاحكين خلال لعبة صيفية" },
  { label: "الطلائع", title: "حلقة الطليعة على العشب", alt: "مرشدات صغيرات يجلسن في حلقة على العشب في اجتماع الطليعة" },
  { label: "القادة", title: "الفريق الذي يقف وراء كل شيء", alt: "قادة شباب يقفون كفريق تحت شجرة، وأحدهم يجلس على كتفي زميله" },
  { label: "الأشبال", title: "صديقان وأساور متطابقة", alt: "شبلان صغيران يتعانقان ويعرضان أساور خرز متطابقة" },
  { label: "المتقدمات", title: "ساعة الغروب على سور الحديقة", alt: "مرشدات متقدمات يجلسن معًا على سور حديقة وقت الغروب" },  { label: "حفل الختام", title: "حفل ختام 2025 — جيل يسلّم جيلًا", alt: "قادة وجوالة يحتفلون على المسرح خلف حروف كلمة SCOUTS الكبيرة في حفل ختام 2025" },
  { label: "رمضان", title: "لافتات الترحيب في إفطار المجموعات", alt: "أشبال وقائد يحملون لافتات ترحيب مكتوبة بخط اليد في إفطار رمضان للمجموعات" },
  { label: "الرحلات", title: "المرشدات في معبد الأقصر", alt: "مجموعة كبيرة من المرشدات وقائداتهن أمام التماثيل الضخمة في معبد الأقصر" },
  { label: "الرحلات", title: "لحظة الغروب على النيل", alt: "كشاف بقبعة عريضة الحافة ينظر من مركب على النيل وقت الغروب" },
  { label: "الرحلات", title: "تحية من مركب النيل", alt: "كشافة وقادة يهتفون ويلوّحون من مقدمة مركب نيلي أبيض" },
  { label: "المجموعة كلها", title: "كل المراحل في صورة واحدة", alt: "صورة بانورامية للمجموعة كلها، من أصغر الأشبال إلى الجوالة، يؤدّون التحية الكشفية في حديقة نخيل" },
  { label: "القادة", title: "إسورة لصديقة جديدة", alt: "قائدة مبتسمة تربط إسورة من الخرز في معصم طفلة صغيرة وهما جالستان على العشب" },
  { label: "حفل الختام", title: "حفل ختام 2024", alt: "قادة وجوالة مجتمعون أمام الشاشة الكبيرة في حفل ختام 2024" },
  { label: "الجوالة", title: "ليلة الألوان", alt: "جوالة وكشافة مغطّون بمسحوق الألوان يبتسمون معًا ليلًا" },
  { label: "المجموعة كلها", title: "معًا تحت الغيوم", alt: "المجموعة كلها مصطفّة لصورة في حديقة خضراء تحت سماء غائمة" },
  { label: "الرحلات", title: "الكشافة عند الأهرامات", alt: "كشافة صغار يؤدّون التحية الكشفية والأهرامات خلفهم" },
];

/** A fresh random order on every visit (Fisher–Yates), so returning
 *  visitors don't always open on the same photo. */
export function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function localizedSlides(locale: Locale) {
  // Translated first, filtered second, so each slide keeps its own Arabic.
  return HERO_SLIDES.map((slide, i) => ({ ...slide, ...over(locale, SLIDES_AR[i]) })).filter(
    (_, i) => !HIDDEN_SLIDES.includes(i + 1),
  );
}

// ------------------------------------------------------------------- stats --
const STAT_LABELS_AR: Record<string, string> = {
  Branches: "فروع",
  Cities: "مدن",
  Stages: "مراحل",
  Founded: "سنة التأسيس",
};
export function localizedStats(locale: Locale) {
  return STATS.map((s) => ({ ...s, label: pick(locale, s.label, STAT_LABELS_AR[s.label]) }));
}

// ---------------------------------------------------------------- about us --
const BRANCHES_AR = [
  { name: "نادي طنطا الرياضي", city: "طنطا", note: "بيتنا الأقدم" },
  { name: "نادي المعلمين بطنطا", city: "طنطا" },
  { name: "نادي الرحاب الرياضي", city: "الرحاب" },
  { name: "نادي مدينتي الرياضي", city: "مدينتي" },
];
export function localizedBranches(locale: Locale) {
  return BRANCHES.map((b, i) => ({ ...b, ...over(locale, BRANCHES_AR[i]) }));
}

const ABOUT_POINTS_AR = [
  "المجموعة الكشفية الرائدة في محافظة الغربية، تحت مظلة الاتحاد العام للكشافة والمرشدات بمصر.",
  "حاضرون في الأندية الرياضية ومراكز الشباب والمدارس الحكومية والخاصة.",
  "فرق مثّلت مصر في فعاليات كشفية داخل البلاد وحول العالم.",
];
export function localizedAboutPoints(locale: Locale) {
  return ABOUT_POINTS.map((p, i) => pick(locale, p, ABOUT_POINTS_AR[i]));
}

// --------------------------------------------------------------- our goals --
const GOALS_AR = [
  { title: "مواطن صالح", body: "إعداد شباب قادرين على الاعتماد على أنفسهم وخدمة مجتمعهم، بدافع من حبهم لأسرهم ومدينتهم ووطنهم." },
  { title: "اكتشاف المواهب", body: "اكتشاف مواهب كل عضو وصقلها ومنحها مساحة لتتألق." },
  { title: "مصر والعالم", body: "أن يتعرّف أبناؤنا وبناتنا على مصر — والعالم من حولها — عن قرب." },
  { title: "المعسكرات والفعاليات", body: "إعداد أعضائنا وترشيحهم للمخيمات والتجمعات والفعاليات الكشفية المحلية والدولية." },
  { title: "صداقات تدوم", body: "بناء صداقات بين الأعضاء — وبين أسرهم أيضًا." },
  { title: "عادة الخدمة", body: "أن تصبح خدمة المجتمع جزءًا من الحياة اليومية، وأن نطبّقها عمليًا." },
];
export function localizedGoals(locale: Locale) {
  return GOALS.map((g, i) => ({ ...g, ...over(locale, GOALS_AR[i]) }));
}

const SEASON_AR: Record<string, { when: string; title: string; where: string }> = {
  "Opening ceremony": { when: "بداية الموسم", title: "حفل الافتتاح", where: "داخلي" },
  "Winter camp": { when: "إجازة منتصف العام", title: "المخيم الشتوي", where: "خارجي" },
  "Summer camp": { when: "نهاية العام الدراسي", title: "المخيم الصيفي", where: "خارجي" },
  "Closing ceremony": { when: "نهاية الموسم", title: "حفل الختام", where: "داخلي" },
};
export function localizedSeason(locale: Locale) {
  return SEASON.map((s) => ({ ...s, ...over(locale, SEASON_AR[s.title]) }));
}

const WIDER_AR = [
  "أنشطة الاتحاد العام للكشافة والمرشدات بمصر",
  "برامج المنظمة الكشفية العربية",
  "لجان ومشروعات المكتب الكشفي العالمي",
  "الاحتفالات والمسابقات مع المجموعات الكشفية الأخرى",
];
export function localizedWider(locale: Locale) {
  return WIDER_SCOUTING.map((w, i) => pick(locale, w, WIDER_AR[i]));
}

const FACTS_AR = [
  "تأسيس الحركة الكشفية",
  "وصول الكشافة إلى مصر",
  "مصر من مؤسسي المنظمة العالمية للحركة الكشفية",
  "شاب ومتطوع في الحركة الكشفية حول العالم",
];
export function localizedFacts(locale: Locale) {
  return SCOUTING_FACTS.map((f, i) => ({
    ...f,
    value: locale === "ar" && f.value === "60M" ? "60 مليون" : f.value,
    label: pick(locale, f.label, FACTS_AR[i]),
  }));
}

// ----------------------------------------------------------------- history --
const VALUES_AR = [
  { title: "الشخصية", body: "الوفاء بالوعد، والاعتراف بالخطأ، وقيادة الطليعة — ثقة تُبنى معسكرًا بعد معسكر." },
  { title: "الخدمة", body: "حملات النظافة، وجمع التبرعات، والمساعدة في فعاليات المجتمع. يتعلّم الكشاف أن العمل الطيب عادة." },
  { title: "الصداقة", body: "طلائع وسمرات ورحلات تحوّل زملاء الدراسة إلى أصدقاء العمر — في كل المراحل." },
];
export function localizedValues(locale: Locale) {
  return VALUES.map((v, i) => ({ ...v, ...over(locale, VALUES_AR[i]) }));
}

const MILESTONES_AR: Record<number, { title: string; body: string }> = {
  1977: {
    title: "التأسيس في طنطا",
    body: "تأسست مجموعة السلام الكشفية في طنطا — بيتها الأقدم حتى اليوم — وانطلقت لنشر الحركة الكشفية إلى ما هو أبعد من مدينة واحدة.",
  },
  2010: {
    title: "افتتاح فرع الرحاب",
    body: "افتتحت مجموعة السلام فرعها في نادي الرحاب الرياضي، لتصل الحركة الكشفية إلى جيل جديد من الكشافة شرق القاهرة.",
  },
  2026: {
    title: "التحول الرقمي",
    body: "انتقلت السجلات من الجداول والأوراق إلى نظام عضوية واحد، ليصرف القادة وقتهم في العمل الكشفي بدلًا من الأعمال الإدارية.",
  },
};
export function localizedMilestones(locale: Locale) {
  return MILESTONES.map((m) => ({ ...m, ...over(locale, MILESTONES_AR[m.year]) }));
}

const PLACES_AR: Record<string, string> = {
  "Luxor & Aswan": "الأقصر وأسوان",
  "Marsa Alam": "مرسى علم",
  "The Oases": "الواحات",
  "South Sinai": "جنوب سيناء",
  "Port Said": "بورسعيد",
  "Marsa Matrouh": "مرسى مطروح",
  Siwa: "سيوة",
  Sinai: "سيناء",
  Hurghada: "الغردقة",
};

export type LocalizedCamp = Camp & {
  /** "Summer Camp · Marsa Alam" — the heading on the rope. */
  title: string;
  /** "Summer Camp 2018 — Marsa Alam" — used where the year isn't shown beside it. */
  fullName: string;
  placeName: string;
  seasonName: string;
};

export function localizedCamps(locale: Locale): LocalizedCamp[] {
  return CAMPS.map((camp) => {
    const placeName = pick(locale, camp.place, PLACES_AR[camp.place]);
    const seasonName =
      locale === "ar" ? (camp.season === "Summer" ? "صيفي" : "شتوي") : camp.season;
    const title =
      locale === "ar"
        ? `المخيم ${camp.season === "Summer" ? "الصيفي" : "الشتوي"} · ${placeName}`
        : `${camp.season} Camp · ${camp.place}`;
    const fullName =
      locale === "ar"
        ? `المخيم ${camp.season === "Summer" ? "الصيفي" : "الشتوي"} ${camp.year} — ${placeName}`
        : `${camp.season} Camp ${camp.year} — ${camp.place}`;
    return { ...camp, placeName, seasonName, title, fullName };
  });
}

/** An album name as stored in Cloudinary ("Summer Camp 2018 — Marsa Alam"). */
export function localizedAlbumName(name: string, locale: Locale): string {
  if (locale !== "ar") return name;
  const m = name.match(/^(Summer|Winter) Camp (\d{4})(?: — (.+))?$/);
  if (!m) return name;
  const season = m[1] === "Summer" ? "الصيفي" : "الشتوي";
  const place = m[3] ? ` — ${PLACES_AR[m[3]] ?? m[3]}` : "";
  return `المخيم ${season} ${m[2]}${place}`;
}

// ----------------------------------------------------------------- gallery --
const GALLERY_AR = [
  { name: "حفل المنديل", alt: "كشاف وقائد يربطان المنديل معًا على العشب" },
  { name: "حلقة الطليعة", alt: "كشافة يجلسون في حلقة على العشب خلال اجتماع الطليعة" },
  { name: "أغانٍ وألعاب", alt: "قائد يقود الأشبال في أنشودة فاتحًا ذراعيه" },
  { name: "يوم المرشدات", alt: "مرشدات بقمصان بيضاء ومناديل يقفن معًا في حديقة" },
  { name: "الملاهي المائية", alt: "كشافان ينظران من خلال عوامة سباحة صفراء مزدوجة" },
  { name: "رحلة على الشاطئ", alt: "كشافة وقادة يقفون على الصخور عند حافة بحر أزرق" },
  { name: "مواقع أثرية", alt: "كشافة مجتمعون أمام بوابة معبد حجرية، واثنان يقفان فوق السور" },
  { name: "متحف القطارات", alt: "مرشدات أمام عربة قطار قديمة خضراء" },
];
export function localizedGallery(locale: Locale) {
  return GALLERY.map((g, i) => ({ ...g, ...over(locale, GALLERY_AR[i]) }));
}
