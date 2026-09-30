"use client";

import Image from "next/image";
import Link from "next/link";
import logo from "@/public/images/logo.png";
import { useT } from "@/lib/i18n/client";

/**
 * The group's emblem with its name — used in the header,
 * the footer and above the sign-in forms, so it lives in one place.
 *
 * The <Image> has empty alt text on purpose: the names next to it already say
 * who this is, and a screen reader announcing "logo, El-Salam Scouts" before
 * "El-Salam Scouts" is noise. The link's accessible name comes from the text.
 */
export function BrandLogo({ className = "" }: { className?: string }) {
  const t = useT();
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
        className="h-9 w-auto min-[380px]:h-10 sm:h-12"
      />
      <span className="flex flex-col leading-tight">
        <span className="font-display text-[0.95rem] font-bold min-[380px]:text-base sm:text-lg">
          {t.chrome.brandTop}
        </span>
        <span className="text-[0.65rem] font-semibold opacity-90 min-[380px]:text-[0.7rem] sm:text-[0.8rem]">
          {t.chrome.brandBottom}
        </span>
      </span>
    </Link>
  );
}
