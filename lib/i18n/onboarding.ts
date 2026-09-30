import type { Question } from "@/lib/onboarding";
import type { Locale } from "@/lib/i18n/config";

/**
 * Arabic for the registration questions (lib/onboarding.ts) and for the
 * messages the onboarding and document actions send back.
 *
 * Keyed by the English text on purpose: the questions and their validation
 * live next to the database rules they mirror, and keeping them in English
 * there means those files didn't need restructuring. Anything missing from
 * this map simply shows in English — nothing breaks.
 */
const AR: Record<string, string> = {
  // ---- Question labels
  "Date of birth": "تاريخ الميلاد",
  "Full address": "العنوان بالكامل",
  "Personal phone": "رقم الهاتف الشخصي",
  "Parent / guardian phone": "رقم هاتف ولي الأمر",
  "Scouting stage": "المرحلة الكشفية",
  "National ID": "الرقم القومي",
  "Birth certificate image": "صورة شهادة الميلاد",
  Gender: "النوع",
  "ID card photo": "صورة بطاقة الرقم القومي",
  "Current status": "الحالة الحالية",
  University: "الجامعة",
  "Faculty / College": "الكلية",
  "Academic year": "السنة الدراسية",
  "Stages you serve": "المراحل التي تخدم بها",
  Committees: "اللجان",
  "Years of leadership experience": "سنوات الخبرة القيادية",
  "Year you joined scouting": "سنة انضمامك إلى الكشافة",

  // ---- Hints and placeholders
  "We work out your age from this, so it stays correct every year.":
    "نحسب عمرك من هذا التاريخ، ليبقى صحيحًا كل عام.",
  "Your age is worked out from this, so it stays correct every year.":
    "يُحسب عمرك من هذا التاريخ، ليبقى صحيحًا كل عام.",
  "11 digits, starting 01.": "11 رقمًا، تبدأ بـ 01.",
  "14 digits": "14 رقمًا",
  "Optional, but needed before camps and official registration.":
    "اختياري، لكنه مطلوب قبل المخيمات والتسجيل الرسمي.",
  "A photo or scan is fine — uploading straight from your phone works. Only you and the site admins can see it.":
    "تكفي صورة أو نسخة ممسوحة ضوئيًا — ويمكنك الرفع مباشرة من هاتفك. لا يراها غيرك أنت ومسؤولو الموقع.",
  "Leaders' documents are filed by gender.": "تُحفظ مستندات القادة حسب النوع.",
  "14 digits. Each leader's number must be unique.": "14 رقمًا. يجب أن يكون رقم كل قائد فريدًا.",
  "A photo or scan of both sides if possible. Only you and the site admins can see it.":
    "صورة أو نسخة ممسوحة للوجهين إن أمكن. لا يراها غيرك أنت ومسؤولو الموقع.",
  "e.g. Third year": "مثال: الفرقة الثالثة",
  "Students only — graduates skip this.": "للطلاب فقط — يتخطاه الخريجون.",
  "Tick every stage you lead. Most leaders serve more than one.":
    "اختر كل مرحلة تقودها. معظم القادة يخدمون في أكثر من مرحلة.",
  "Tick every committee you're part of, if any.": "اختر كل لجنة تنتمي إليها، إن وُجدت.",
  "Choose a year…": "اختر السنة…",

  // ---- Options
  "University student": "طالب جامعي",
  Graduate: "خريج",
  "Program committee": "لجنة البرامج",
  "Media committee": "لجنة الإعلام",
  "Secretary committee": "لجنة السكرتارية",
  "Tools & logistics committee": "لجنة الأدوات والإمداد",
  "Training committee": "لجنة التدريب",
  Male: "ذكر",
  Female: "أنثى",
  Buds: "براعم",
  Blossoms: "زهرات",
  Cubs: "أشبال",
  Guides: "مرشدات",
  Scouts: "كشافة",
  "Senior Guides": "متقدمات",
  "Senior Scouts": "متقدم",
  Rovers: "جوالة",

  // ---- Validation and results (app/onboarding/actions.ts)
  "Enter a valid date.": "أدخل تاريخًا صحيحًا.",
  "That date is in the future.": "هذا التاريخ في المستقبل.",
  "That date looks wrong.": "يبدو أن هذا التاريخ غير صحيح.",
  "Please enter your address.": "يُرجى إدخال عنوانك.",
  "A national ID is exactly 14 digits.": "الرقم القومي مكوّن من 14 رقمًا بالضبط.",
  "Please upload the birth certificate.": "يُرجى رفع شهادة الميلاد.",
  "Choose your stage.": "اختر مرحلتك.",
  "Choose one of the listed stages.": "اختر إحدى المراحل المعروضة.",
  "Please fix the highlighted answers.": "يُرجى تصحيح الإجابات المحددة.",
  "Could not store the certificate. Please try again.": "تعذّر حفظ الشهادة. يُرجى المحاولة مرة أخرى.",
  "That national ID is already registered.": "هذا الرقم القومي مسجّل بالفعل.",
  "Your details have been saved.": "تم حفظ بياناتك.",
  "Choose the year you joined.": "اختر سنة انضمامك.",
  "That year is in the future.": "هذه السنة في المستقبل.",
  "You cannot have joined before you were born.": "لا يمكن أن تكون قد انضممت قبل ميلادك.",
  "Please upload a photo of your ID card.": "يُرجى رفع صورة بطاقة الرقم القومي.",
  "Choose male or female.": "اختر ذكر أو أنثى.",
  "Choose one of the listed options.": "اختر أحد الخيارات المعروضة.",
  "Please enter your university.": "يُرجى إدخال اسم جامعتك.",
  "Please enter your faculty.": "يُرجى إدخال اسم كليتك.",
  "Students need to give an academic year.": "على الطلاب إدخال السنة الدراسية.",
  "Enter a whole number of years, 0 to 70.": "أدخل عددًا صحيحًا من السنوات، من 0 إلى 70.",
  "Tick at least one stage.": "اختر مرحلة واحدة على الأقل.",
  "Choose from the listed stages.": "اختر من المراحل المعروضة.",
  "Choose from the listed committees.": "اختر من اللجان المعروضة.",
  "Could not store the ID card photo. Please try again.": "تعذّر حفظ صورة البطاقة. يُرجى المحاولة مرة أخرى.",
  "You need to be signed in.": "يجب تسجيل الدخول أولًا.",
  "Could not save your details. Please try again.": "تعذّر حفظ بياناتك. يُرجى المحاولة مرة أخرى.",

  // ---- Documents (document-actions.ts, lib/storage-paths.ts)
  "Use a JPG, PNG, WebP or PDF.": "استخدم ملف JPG أو PNG أو WebP أو PDF.",
  "That file is over 10 MB. Try a smaller photo.": "حجم الملف أكبر من 10 ميجابايت. جرّب صورة أصغر.",
  "No document on file.": "لا يوجد مستند محفوظ.",
  "Could not open the document. Please try again.": "تعذّر فتح المستند. يُرجى المحاولة مرة أخرى.",
  "Document removed.": "تم حذف المستند.",
  "An ID card photo is required for leaders. Upload a replacement instead of removing this one.":
    "صورة البطاقة مطلوبة للقادة. ارفع صورة بديلة بدلًا من حذف هذه.",
  "That file doesn't belong to your account.": "هذا الملف لا يخص حسابك.",
  "Could not find a free file name. Please try again.": "تعذّر إيجاد اسم ملف متاح. يُرجى المحاولة مرة أخرى.",
  "Storage rejected the upload request. The settings are present but not working — check the server logs.":
    "رفضت خدمة التخزين طلب الرفع. الإعدادات موجودة لكنها لا تعمل — راجع سجلات الخادم.",
  "Not allowed.": "غير مسموح.",
  "No document.": "لا يوجد مستند.",
  "Storage refused the request. Check the server logs.": "رفضت خدمة التخزين الطلب. راجع سجلات الخادم.",

  // ---- Members admin (app/members/actions.ts)
  "Only the head site admin can delete accounts.": "المسؤول الرئيسي للموقع وحده يمكنه حذف الحسابات.",
  "Nothing to delete.": "لا يوجد ما يمكن حذفه.",
  "You can't delete your own account.": "لا يمكنك حذف حسابك.",
  "That member no longer exists.": "هذا العضو لم يعد موجودًا.",
  "Head site admin accounts can't be deleted from here.": "لا يمكن حذف حسابات المسؤول الرئيسي من هنا.",
  "Could not delete that account. Please try again.": "تعذّر حذف هذا الحساب. يُرجى المحاولة مرة أخرى.",
  "Only the head site admin can issue recovery links.": "المسؤول الرئيسي للموقع وحده يمكنه إصدار روابط الاستعادة.",
  "No member selected.": "لم يتم اختيار عضو.",
  "You can't issue a recovery link for another head admin.": "لا يمكنك إصدار رابط استعادة لمسؤول رئيسي آخر.",
  "Could not find an email address for that member.": "تعذّر العثور على بريد إلكتروني لهذا العضو.",
  "Only the head site admin can approve requests.": "المسؤول الرئيسي للموقع وحده يمكنه قبول الطلبات.",
  "No request selected.": "لم يتم اختيار طلب.",
  "Choose a role to give them.": "اختر الدور الذي ستمنحه.",
  "That request no longer exists.": "هذا الطلب لم يعد موجودًا.",
  "That account has already been reviewed.": "تمت مراجعة هذا الحساب بالفعل.",
  "Only the head site admin can reject requests.": "المسؤول الرئيسي للموقع وحده يمكنه رفض الطلبات.",
  "That's your own account.": "هذا حسابك أنت.",
  "That account has already been approved — delete it from the members table instead.":
    "تم قبول هذا الحساب بالفعل — احذفه من جدول الأعضاء بدلًا من ذلك.",
  "Could not remove that account. Please try again.": "تعذّر حذف هذا الحساب. يُرجى المحاولة مرة أخرى.",
  "Only the head site admin can change roles.": "المسؤول الرئيسي للموقع وحده يمكنه تغيير الأدوار.",
  "Choose a role.": "اختر دورًا.",
  "You can't change your own role — that would lock you out.": "لا يمكنك تغيير دورك — فقد يؤدي ذلك إلى فقدانك صلاحية الوصول.",
  "Head site admin accounts can't be changed from here.": "لا يمكن تعديل حسابات المسؤول الرئيسي من هنا.",
};

/** Patterns for messages with a number or detail inside them. */
const AR_PATTERNS: [RegExp, (...m: string[]) => string][] = [
  [/^Keep it under (\d+) characters\.$/, (_, n) => `يجب ألا يتجاوز النص ${n} حرفًا.`],
  [
    /^Your details saved, but the committees did not\. ([\s\S]*)$/,
    (_, rest) => `حُفظت بياناتك، لكن لم تُحفظ اللجان. (${rest})`,
  ],
];

/** The Arabic for one English message, or the message itself. */
export function arText(locale: Locale, text: string): string;
export function arText(locale: Locale, text: string | undefined): string | undefined;
export function arText(locale: Locale, text: string | undefined) {
  if (locale !== "ar" || !text) return text;
  // Already Arabic (built from the dictionary) — leave it alone.
  if (/[\u0600-\u06FF]/.test(text)) return text;
  if (AR[text]) return AR[text];
  for (const [re, fn] of AR_PATTERNS) {
    const m = text.match(re);
    if (m) return fn(...m);
  }
  // Technical database/storage diagnostics stay in English (they are meant to
  // be pasted to whoever maintains the site), but get an Arabic lead-in.
  return `حدث خطأ تقني: ${text}`;
}

/** Translates the error/notice/fieldErrors of an action result. */
export function localizeState<
  S extends { error?: string; notice?: string; fieldErrors?: Partial<Record<string, string>> },
>(state: S, locale: Locale): S {
  if (locale !== "ar") return state;
  const fieldErrors = state.fieldErrors
    ? Object.fromEntries(
        Object.entries(state.fieldErrors).map(([k, v]) => [k, arText(locale, v)]),
      )
    : undefined;
  return {
    ...state,
    ...(state.error ? { error: arText(locale, state.error) } : {}),
    ...(state.notice ? { notice: label(locale, state.notice) } : {}),
    ...(fieldErrors ? { fieldErrors } : {}),
  };
}

/** Plain lookup — no technical-error lead-in. For labels and options. */
function label(locale: Locale, text: string): string {
  return locale === "ar" ? (AR[text] ?? text) : text;
}

/** The registration questions in the reader's language. */
export function localizeQuestions(questions: Question[], locale: Locale): Question[] {
  if (locale !== "ar") return questions;
  return questions.map((q) => ({
    ...q,
    label: label(locale, q.label),
    hint: q.hint ? label(locale, q.hint) : q.hint,
    placeholder: q.placeholder && !/^01X+$/.test(q.placeholder) ? label(locale, q.placeholder) : q.placeholder,
    options: q.options?.map((o) => ({ ...o, label: label(locale, o.label) })),
  }));
}

/** An option label (stage, committee, status, gender) in the reader's language. */
export function optionLabel(locale: Locale, english: string): string {
  return label(locale, english);
}
