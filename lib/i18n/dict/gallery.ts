/** Camp Gallery, album pages and the photo viewer. */
const en = {
  metaTitle: "Camp Gallery",
  metaDescription: "Photo albums from El-Salam Scouting Group camps, hikes and events.",
  title: "Camp Gallery",
  eyebrow: "Activities",
  introAlbums: "Every camp, hike and event — one album at a time. Open an album to see all its photos.",
  introPhotos: "Every camp, hike and event — one album at a time. Tap a photo to see it full size.",
  photoCount: (n: number) => `${n} ${n === 1 ? "photo" : "photos"}`,
  albumIntro: (n: number) => `${n} ${n === 1 ? "photo" : "photos"}. Tap any photo to see it full size.`,
  albumMetaTitle: (name: string) => `${name} — Camp Gallery`,
  albumMetaDescription: (n: number, name: string) => `${n} photos from ${name} — El-Salam Scouting Group.`,
  allAlbums: "All albums",
  photoAlt: (i: number, name: string) => `Photo ${i} from ${name}`,
  openPhoto: (label: string, i: number, n: number) => `${label} — open photo ${i} of ${n}`,
  viewerLabel: (name: string | undefined, i: number, n: number) =>
    `${name ? `${name}, photo` : "Photo"} ${i} of ${n}`,
  counter: (i: number, n: number) => `${i} / ${n}`,
  closePhoto: "Close photo",
  previousPhoto: "Previous photo",
  nextPhoto: "Next photo",
};

const ar: typeof en = {
  metaTitle: "معرض صور المعسكرات",
  metaDescription: "ألبومات صور من معسكرات مجموعة السلام الكشفية ورحلاتها وفعالياتها.",
  title: "معرض صور المعسكرات",
  eyebrow: "الأنشطة",
  introAlbums: "كل مخيم ورحلة وفعالية — ألبوم تلو الآخر. افتح أي ألبوم لتشاهد كل صوره.",
  introPhotos: "كل مخيم ورحلة وفعالية — ألبوم تلو الآخر. اضغط على أي صورة لعرضها بالحجم الكامل.",
  photoCount: (n) => (n === 1 ? "صورة واحدة" : `${n} صورة`),
  albumIntro: (n) => `${n === 1 ? "صورة واحدة" : `${n} صورة`}. اضغط على أي صورة لعرضها بالحجم الكامل.`,
  albumMetaTitle: (name) => `${name} — معرض الصور`,
  albumMetaDescription: (n, name) => `${n} صورة من ${name} — مجموعة السلام الكشفية.`,
  allAlbums: "كل الألبومات",
  photoAlt: (i, name) => `الصورة ${i} من ${name}`,
  openPhoto: (label, i, n) => `${label} — فتح الصورة ${i} من ${n}`,
  viewerLabel: (name, i, n) => `${name ? `${name}، الصورة` : "الصورة"} ${i} من ${n}`,
  counter: (i, n) => `${i} من ${n}`,
  closePhoto: "إغلاق الصورة",
  previousPhoto: "الصورة السابقة",
  nextPhoto: "الصورة التالية",
};

export default { en, ar };
