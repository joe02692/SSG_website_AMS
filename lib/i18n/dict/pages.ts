/** Smaller pages: stages, seasonal plan, 404, errors, loading. */
const en = {
  stages: {
    metaTitle: "Our Stages",
    metaDescription: "The stages of El-Salam Scouting Group, from the youngest Buds to the Rovers.",
    title: (n: number) =>
      `${["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"][n] ?? n} Stages, One Family`,
    eyebrow: "Our Stages",
    intro: "From the youngest Buds to the Rovers, every age has a place. You choose your stage when you register.",
    knowStage: "Know your stage? Registration takes about a minute.",
    startRegistration: "Start registration",
  },
  seasonal: {
    metaTitle: "Seasonal Plan",
    metaDescription: "The season's plan for El-Salam leaders.",
    title: "Seasonal Plan",
    eyebrow: "Leaders only",
    intro: "Meetings, camps and activities for the season, stage by stage.",
    heading: "We're still pitching this tent",
    body: "The seasonal plan is under construction. Grab your toolbox and check back soon — no knots will be left untied.",
    back: "Back to my dashboard",
    stickerTop: "UNDER CONSTRUCTION",
    stickerBottom: "SCOUTS AT WORK",
  },
  notFound: {
    metaTitle: "Page not found",
    heading: "This trail doesn't lead anywhere",
    body: "The page may have moved, or the link may have a typo. Let's get you back to camp.",
    home: "Back to the homepage",
    joinUs: "Join Us",
    history: "Our History",
    stages: "Our Stages",
    gallery: "Camp Gallery",
  },
  error: {
    heading: "Something went wrong",
    body: "This page couldn't load just now. It's usually a short hiccup — please try again in a moment.",
    globalBody: "The site couldn't load just now. Please try again in a moment.",
    tryAgain: "Try again",
    homepage: "Homepage",
    code: "If it keeps happening, send this code to the site admin:",
    codeShort: "Code:",
    title: "Something went wrong · El-Salam Scouting Group",
  },
  loading: "Loading…",
};

const ar: typeof en = {
  stages: {
    metaTitle: "مراحلنا",
    metaDescription: "مراحل مجموعة السلام الكشفية، من البراعم الأصغر سنًا حتى الجوالة.",
    title: (n) =>
      `${["صفر", "مرحلة واحدة", "مرحلتان", "ثلاث مراحل", "أربع مراحل", "خمس مراحل", "ست مراحل", "سبع مراحل", "ثماني مراحل", "تسع مراحل", "عشر مراحل"][n] ?? `${n} مراحل`}، وعائلة واحدة`,
    eyebrow: "مراحلنا",
    intro: "من البراعم الأصغر سنًا حتى الجوالة، لكل عمر مكان. تختار مرحلتك عند التسجيل.",
    knowStage: "تعرف مرحلتك؟ التسجيل يستغرق دقيقة تقريبًا.",
    startRegistration: "ابدأ التسجيل",
  },
  seasonal: {
    metaTitle: "الخطة الموسمية",
    metaDescription: "خطة الموسم لقادة مجموعة السلام.",
    title: "الخطة الموسمية",
    eyebrow: "للقادة فقط",
    intro: "الاجتماعات والمخيمات والأنشطة للموسم، مرحلة بمرحلة.",
    heading: "ما زلنا ننصب هذه الخيمة",
    body: "الخطة الموسمية قيد الإنشاء. جهّز عدّتك وعُد قريبًا — لن نترك عقدة دون ربط.",
    back: "العودة إلى لوحة التحكم",
    stickerTop: "قيد الإنشاء",
    stickerBottom: "الكشافة في العمل",
  },
  notFound: {
    metaTitle: "الصفحة غير موجودة",
    heading: "هذا الطريق لا يؤدي إلى أي مكان",
    body: "ربما نُقلت الصفحة، أو قد يكون في الرابط خطأ مطبعي. دعنا نُعِدك إلى المخيم.",
    home: "العودة إلى الصفحة الرئيسية",
    joinUs: "انضم إلينا",
    history: "تاريخنا",
    stages: "مراحلنا",
    gallery: "معرض صور المعسكرات",
  },
  error: {
    heading: "حدث خطأ ما",
    body: "تعذّر تحميل هذه الصفحة الآن. غالبًا ما يكون عطلًا عابرًا — يُرجى المحاولة مرة أخرى بعد قليل.",
    globalBody: "تعذّر تحميل الموقع الآن. يُرجى المحاولة مرة أخرى بعد قليل.",
    tryAgain: "حاول مرة أخرى",
    homepage: "الصفحة الرئيسية",
    code: "إذا تكرر الأمر، أرسل هذا الرمز إلى مسؤول الموقع:",
    codeShort: "الرمز:",
    title: "حدث خطأ ما · مجموعة السلام الكشفية",
  },
  loading: "جارٍ التحميل…",
};

export default { en, ar };
