import Image from "next/image";
import Link from "next/link";
import logo from "@/public/images/logo.png";

/**
 * The group's emblem with its Arabic and English names — used in the header,
 * the footer and above the sign-in forms, so it lives in one place.
 *
 * The <Image> has empty alt text on purpose: the names next to it already say
 * who this is, and a screen reader announcing "logo, El-Salam Scouts" before
 * "El-Salam Scouts" is noise. The link's accessible name comes from the text.
 */
export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`flex shrink-0 items-center gap-2 text-white sm:gap-2.5 ${className}`}
    >
      <Image
        src={logo}
        alt=""
        priority
        sizes="64px"
        className="h-9 w-auto min-[380px]:h-11 sm:h-[55px]"
      />
      <span className="flex flex-col text-[0.65rem] font-semibold leading-tight min-[380px]:text-[0.7rem] sm:text-[0.95rem]">
        <span lang="ar" dir="rtl">
          مجموعة السلام الكشفية
        </span>
        <span className="opacity-90">El-Salam Scouts</span>
      </span>
    </Link>
  );
}
