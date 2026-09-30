/** Homepage words (the slideshow, intro, about, goals, scouting, contact, join). */
const en = {
  metaTitle: "El-Salam Scouting Group",
  metaDescription:
    "El-Salam Scout Group — one of Egypt's oldest scout groups, building character, service and friendship since 1977 in Tanta, Al Rehab and Madinaty.",
  heroTagline: "Character, Service & Friendship",
  heroSince: "SINCE",
  joinUs: "Join Us",
  ourStory: "Our Story",
  choosePhoto: "Choose a photo",
  slideLabel: (label: string, title: string, n: number, total: number) =>
    `${label}: ${title} — photo ${n} of ${total}`,
  welcome: "Welcome",
  intro:
    "One of Egypt's oldest scout groups, from Tanta to Al Rehab and Madinaty. We hike, camp, serve our community — and grow up a little braver for it.",
  registrationOpen: "New season registration is currently available",
  about: {
    title: "About Us",
    subtitle: (year: number) => `One of Egypt's oldest scout groups — since ${year}`,
    p1: (year: number) =>
      `El-Salam Scout Group has been spreading Scouting since ${year}. It began in Tanta, where its oldest home still stands, and grew into one of the most respected scout groups in Egypt and the Arab world.`,
    p2: "Taking responsibility is one of Scouting's first lessons, and we took it to heart. Rather than stay in one city, El-Salam carried Scouting to young people wherever they gather — sports clubs, youth centres, and public and private schools across Egypt. When schools asked us to stay for good, we stayed.",
    p3: "Today our teams shine across Egypt and around the world, and the need has never been greater: a generation that learns to work as a team, stand out, and serve the people around it.",
    photoAlt: "Young El-Salam leaders posing as a team under a tree",
    since: (year: number) => `Since ${year}`,
    whereWeMeet: "Where we meet",
  },
  goals: {
    title: "Our Goals",
    subtitle: "What every meeting, camp and trip is for",
    seasonTitle: "A season with El-Salam",
    seasonSubtitle: "The fixed points every branch shares, every year.",
    beyondTitle: "Beyond our group",
    beyondIntro: "Each year, as the annual plan allows, we take part in:",
    refreshed:
      "Our programmes are refreshed every season by members who are specialists in their own fields — always true to the foundations of Scouting.",
  },
  scouting: {
    eyebrow: "About Scouting",
    title: "The world's leading educational youth movement",
    p1: "Scouting is a worldwide educational movement for young people — non-political and open to everyone. Its aim is to raise good citizens: leaders who love teamwork, make a difference through their conduct and character, and can get along with anyone while staying true to themselves.",
    p2: "Scouts learn by doing. Values are built and habits corrected through camps, life outdoors and regular activities — not lectures. In Egypt, Scouting has shaped ministers, scientists and public figures in every field.",
  },
  explore: {
    title: "Explore El-Salam",
    subtitle: "Everything about the group, one page at a time",
    history: "Our History",
    historyBody: (year: number) =>
      `From Tanta in ${year} to clubs and schools across Egypt — and what we still stand for.`,
    historyAlt: "Scouts sitting in a circle on the grass during a patrol meeting",
    stages: "Our Stages",
    stagesBody: (n: number) => `${n} stages from the youngest Buds to the Rovers — every age has a place.`,
    stagesAlt: "Guides in white shirts and neckerchiefs posing together in a park",
    activities: "Activities",
    activitiesBody: "Hikes, camps, trips and service — a look at a year with El-Salam.",
    activitiesAlt: "Scouts and leaders standing on rocks at the edge of a blue sea",
  },
  contact: {
    title: "Contact Us",
    subtitle: "Questions about joining? We'd love to hear from you.",
    call: "Call us",
    callHint: "Questions about joining or stages",
    instagram: "Instagram",
    instagramHint: "Camp photos and news",
    facebook: "Facebook",
    facebookName: "El-Salam Scouts · Al Rehab",
    facebookHint: "Announcements and events",
  },
  join: {
    title: "Ready to join us?",
    body: "Create your scout account in a minute. Leaders send a request the group approves — parent accounts are coming soon.",
    signUp: "Sign Up",
    haveAccount: "Already have an account?",
    logIn: "Log in",
  },
};

const ar: typeof en = {
  metaTitle: "مجموعة السلام الكشفية",
  metaDescription:
    "مجموعة السلام الكشفية — من أعرق المجموعات الكشفية في مصر، تبني الشخصية وروح الخدمة والصداقة منذ عام 1977 في طنطا والرحاب ومدينتي.",
  heroTagline: "الشخصية والخدمة والصداقة",
  heroSince: "منذ",
  joinUs: "انضم إلينا",
  ourStory: "قصتنا",
  choosePhoto: "اختر صورة",
  slideLabel: (label, title, n, total) => `${label}: ${title} — الصورة ${n} من ${total}`,
  welcome: "أهلًا بكم",
  intro:
    "من أعرق المجموعات الكشفية في مصر، من طنطا إلى الرحاب ومدينتي. نخرج في الرحلات، ونقيم المخيمات، ونخدم مجتمعنا — ونكبر مع كل تجربة أكثر شجاعة.",
  registrationOpen: "التسجيل للموسم الجديد متاح الآن",
  about: {
    title: "من نحن",
    subtitle: (year) => `من أعرق المجموعات الكشفية في مصر — منذ عام ${year}`,
    p1: (year) =>
      `تنشر مجموعة السلام الكشفية الحركة الكشفية منذ عام ${year}. بدأت في طنطا، حيث لا يزال بيتها الأقدم قائمًا، ونمت لتصبح من أكثر المجموعات الكشفية احترامًا في مصر والوطن العربي.`,
    p2: "تحمّل المسؤولية من أول دروس الحركة الكشفية، وقد أخذناه بجدية. فبدلًا من البقاء في مدينة واحدة، حملت مجموعة السلام الفكر الكشفي إلى الشباب أينما اجتمعوا — في الأندية الرياضية ومراكز الشباب والمدارس الحكومية والخاصة في أنحاء مصر. وحين طلبت منا المدارس البقاء بشكل دائم، بقينا.",
    p3: "واليوم تتألق فرقنا في أنحاء مصر وحول العالم، والحاجة إلينا أكبر من أي وقت مضى: جيل يتعلم العمل بروح الفريق، ويتميّز، ويخدم من حوله.",
    photoAlt: "قادة شباب من مجموعة السلام يقفون كفريق تحت شجرة",
    since: (year) => `منذ ${year}`,
    whereWeMeet: "أين نلتقي",
  },
  goals: {
    title: "أهدافنا",
    subtitle: "الغاية من كل اجتماع ومخيم ورحلة",
    seasonTitle: "موسم مع مجموعة السلام",
    seasonSubtitle: "المحطات الثابتة التي تشترك فيها كل الفروع كل عام.",
    beyondTitle: "خارج حدود مجموعتنا",
    beyondIntro: "نشارك كل عام، وفقًا للخطة السنوية، في:",
    refreshed:
      "نجدّد برامجنا كل موسم بمشاركة أعضاء متخصصين في مجالاتهم — مع الالتزام الدائم بأسس الحركة الكشفية.",
  },
  scouting: {
    eyebrow: "عن الحركة الكشفية",
    title: "الحركة الشبابية التربوية الرائدة في العالم",
    p1: "الحركة الكشفية حركة تربوية عالمية للشباب — غير سياسية ومفتوحة للجميع. تهدف إلى بناء مواطن صالح: قائد يحب العمل الجماعي، ويؤثر في مجتمعه بسلوكه القويم وأخلاقه الحميدة، ويحسن التعامل مع الناس جميعًا دون أن يتخلى عن مبادئه.",
    p2: "يتعلم الكشاف بالممارسة. فالقيم تُغرس والسلوك يُقوَّم من خلال المخيمات وحياة الخلاء والأنشطة الدورية — لا بالمحاضرات. وفي مصر، خرّجت الحركة الكشفية وزراء وعلماء وشخصيات عامة في شتى المجالات.",
  },
  explore: {
    title: "تعرّف على مجموعة السلام",
    subtitle: "كل ما يخص المجموعة، صفحة بصفحة",
    history: "تاريخنا",
    historyBody: (year) => `من طنطا عام ${year} إلى الأندية والمدارس في أنحاء مصر — وما زلنا على مبادئنا.`,
    historyAlt: "كشافة يجلسون في حلقة على العشب خلال اجتماع الطليعة",
    stages: "مراحلنا",
    stagesBody: (n) => `${n} مراحل من البراعم الأصغر سنًا حتى الجوالة — لكل عمر مكان.`,
    stagesAlt: "مرشدات بقمصان بيضاء ومناديل يقفن معًا في حديقة",
    activities: "الأنشطة",
    activitiesBody: "رحلات ومخيمات وخدمة عامة — لمحة عن عام مع مجموعة السلام.",
    activitiesAlt: "كشافة وقادة يقفون على الصخور عند حافة بحر أزرق",
  },
  contact: {
    title: "تواصل معنا",
    subtitle: "لديك سؤال عن الانضمام؟ يسعدنا أن نسمع منك.",
    call: "اتصل بنا",
    callHint: "استفسارات الانضمام والمراحل",
    instagram: "إنستجرام",
    instagramHint: "صور المعسكرات والأخبار",
    facebook: "فيسبوك",
    facebookName: "كشافة السلام · الرحاب",
    facebookHint: "الإعلانات والفعاليات",
  },
  join: {
    title: "مستعد للانضمام إلينا؟",
    body: "أنشئ حساب الكشاف في دقيقة. يرسل القادة طلبًا توافق عليه المجموعة — وحسابات أولياء الأمور قريبًا.",
    signUp: "إنشاء حساب",
    haveAccount: "لديك حساب بالفعل؟",
    logIn: "تسجيل الدخول",
  },
};

export default { en, ar };
