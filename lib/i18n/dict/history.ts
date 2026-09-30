/** History page, the rope and its photo viewer. */
const en = {
  metaTitle: "Our History",
  metaDescription: (year: number) =>
    `How El-Salam Scouting Group grew from Tanta in ${year} — every milestone and every camp since, with photos.`,
  eyebrow: "Same values · A brighter tomorrow",
  title: "Our History",
  subtitle: (years: number) =>
    `${years >= 55 ? "Nearly sixty" : years >= 45 ? "Nearly fifty" : years} years of Scouting, from Tanta outwards`,
  intro:
    "What began in Tanta in 1977 now reaches sports clubs, youth centres and schools across Egypt. The uniform has changed; the promise hasn't.",
  ropeHeading: (year: number) => `Milestones and camps, from ${year} to today`,
  ropeNote: (firstCamp: number, withPhotos: boolean) =>
    `Every milestone and every camp since ${firstCamp}${withPhotos ? " — tap a camp's photo to see all its pictures." : "."}`,
  momentsTitle: "Moments That Matter",
  momentsBody: "Camps, hikes, service projects and more — one adventure at a time.",
  seeAll: "See All",
  valuesTitle: "What We Stand For",
  valuesSubtitle: "Three words on every neckerchief",
  seeStages: "See our stages",
  joinUs: "Join Us",
  photosComingSoon: "Photos coming soon",
  seePhotos: (n: number, name: string) => `See ${n} photos from ${name}`,
  photoCount: (n: number) => `${n} photos`,
  open: "Open",
  openAlbum: "Open album page",
  closePhotos: "Close photos",
  photoAlt: (i: number, n: number, name: string) => `Photo ${i} of ${n} from ${name}`,
  previousPhoto: "Previous photo",
  nextPhoto: "Next photo",
  showPhoto: (i: number, n: number) => `Show photo ${i} of ${n}`,
  counter: (i: number, n: number) => `${i} / ${n}`,
};

const ar: typeof en = {
  metaTitle: "تاريخنا",
  metaDescription: (year) =>
    `كيف نمت مجموعة السلام الكشفية منذ انطلاقها من طنطا عام ${year} — كل محطة وكل مخيم، بالصور.`,
  eyebrow: "القيم نفسها · غدٌ أكثر إشراقًا",
  title: "تاريخنا",
  subtitle: (years) =>
    years >= 55
      ? "قرابة ستين عامًا من العمل الكشفي، انطلاقًا من طنطا"
      : years >= 45
        ? "قرابة خمسين عامًا من العمل الكشفي، انطلاقًا من طنطا"
        : `${years} عامًا من العمل الكشفي، انطلاقًا من طنطا`,
  intro:
    "ما بدأ في طنطا عام 1977 يصل اليوم إلى الأندية الرياضية ومراكز الشباب والمدارس في أنحاء مصر. تغيّر الزي، أما الوعد فباقٍ كما هو.",
  ropeHeading: (year) => `المحطات والمخيمات، من ${year} حتى اليوم`,
  ropeNote: (firstCamp, withPhotos) =>
    `كل محطة وكل مخيم منذ ${firstCamp}${withPhotos ? " — اضغط على صورة المخيم لعرض كل صوره." : "."}`,
  momentsTitle: "لحظات لا تُنسى",
  momentsBody: "مخيمات ورحلات ومشروعات خدمة وأكثر — مغامرة تلو الأخرى.",
  seeAll: "عرض الكل",
  valuesTitle: "ما نؤمن به",
  valuesSubtitle: "ثلاث كلمات على كل منديل",
  seeStages: "تعرّف على مراحلنا",
  joinUs: "انضم إلينا",
  photosComingSoon: "الصور قريبًا",
  seePhotos: (n, name) => `عرض ${n} صورة من ${name}`,
  photoCount: (n) => `${n} صورة`,
  open: "فتح",
  openAlbum: "فتح صفحة الألبوم",
  closePhotos: "إغلاق الصور",
  photoAlt: (i, n, name) => `الصورة ${i} من ${n} من ${name}`,
  previousPhoto: "الصورة السابقة",
  nextPhoto: "الصورة التالية",
  showPhoto: (i, n) => `عرض الصورة ${i} من ${n}`,
  counter: (i, n) => `${i} من ${n}`,
};

export default { en, ar };
