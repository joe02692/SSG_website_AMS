import type { Role } from "@/lib/roles";

/** Role names and what each can do. */
const en: { labels: Record<Role, string>; plural: Record<Role, string>; descriptions: Record<Role, string> } = {
  labels: {
    scout: "Scout",
    parent: "Parent / Guardian",
    pending_leader: "Awaiting approval",
    stage_leader: "Stage Leader",
    stage_admin: "Stage Admin",
    site_admin: "Site Admin",
    head_site_admin: "Head Site Admin",
    leader: "Leader",
  },
  plural: {
    scout: "Scouts",
    parent: "Parents / Guardians",
    pending_leader: "Awaiting approval",
    stage_leader: "Stage Leaders",
    stage_admin: "Stage Admins",
    site_admin: "Site Admins",
    head_site_admin: "Head Site Admins",
    leader: "Leaders",
  },
  descriptions: {
    scout: "A member of the group taking part in meetings and camps.",
    parent: "A parent or guardian following a scout in the group.",
    pending_leader:
      "Has asked to join as a leader and is waiting for the head site admin to approve it. No access until then.",
    stage_leader: "Runs sessions and activities for a stage.",
    stage_admin: "Oversees a stage — its members, records and season plan.",
    site_admin: "Manages the website and can view every member.",
    head_site_admin: "Runs the system, approves leader requests and sets everyone’s role.",
    leader: "Runs sections, manages records and approves members.",
  },
};

const ar: typeof en = {
  labels: {
    scout: "كشاف",
    parent: "ولي أمر",
    pending_leader: "بانتظار الموافقة",
    stage_leader: "قائد مرحلة",
    stage_admin: "مسؤول مرحلة",
    site_admin: "مسؤول الموقع",
    head_site_admin: "المسؤول الرئيسي للموقع",
    leader: "قائد",
  },
  plural: {
    scout: "الكشافة",
    parent: "أولياء الأمور",
    pending_leader: "بانتظار الموافقة",
    stage_leader: "قادة المراحل",
    stage_admin: "مسؤولو المراحل",
    site_admin: "مسؤولو الموقع",
    head_site_admin: "المسؤولون الرئيسيون",
    leader: "القادة",
  },
  descriptions: {
    scout: "عضو في المجموعة يشارك في الاجتماعات والمخيمات.",
    parent: "ولي أمر يتابع أحد الكشافة في المجموعة.",
    pending_leader: "طلب الانضمام كقائد وينتظر موافقة المسؤول الرئيسي للموقع. لا صلاحيات حتى تتم الموافقة.",
    stage_leader: "يدير الجلسات والأنشطة الخاصة بإحدى المراحل.",
    stage_admin: "يشرف على مرحلة — أعضائها وسجلاتها وخطتها الموسمية.",
    site_admin: "يدير الموقع ويمكنه الاطلاع على بيانات جميع الأعضاء.",
    head_site_admin: "يدير النظام، ويوافق على طلبات القادة، ويحدد أدوار الجميع.",
    leader: "يدير الأقسام، ويتابع السجلات، ويوافق على الأعضاء.",
  },
};

export default { en, ar };
