import type { Metadata, Viewport } from "next";
import { Noto_Sans, Noto_Sans_Arabic } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SITE_URL } from "@/lib/site-url";
import { I18nProvider } from "@/lib/i18n/client";
import { dirOf } from "@/lib/i18n/config";
import { getLocale, getT } from "@/lib/i18n/server";
import "./globals.css";

// The same type family World Scouting uses on scout.org: Noto Sans for Latin
// text and Noto Sans Arabic for Arabic. (scout.org's headline face, "Scouts GT
// Planar", is a custom font licensed to WOSM only, so headings here use Noto
// Sans in bold instead.) Both are variable fonts, so every weight is one file.
const notoSans = Noto_Sans({
  variable: "--font-noto",
  subsets: ["latin"],
  display: "swap",
});

const notoSansArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getT();
  const name = t.chrome.groupName;
  return {
    // Makes the share image and canonical links absolute URLs.
    metadataBase: new URL(SITE_URL),
    applicationName: name,
    title: { default: name, template: `%s · ${name}` },
    description: t.home.metaDescription,
    // What WhatsApp, Facebook and X show when a link is shared. The picture
    // itself is app/opengraph-image.jpg, which Next picks up by its name.
    openGraph: {
      type: "website",
      siteName: name,
      title: name,
      locale: locale === "ar" ? "ar_EG" : "en_US",
      alternateLocale: locale === "ar" ? ["en_US"] : ["ar_EG"],
      description: t.home.metaDescription,
    },
    twitter: { card: "summary_large_image" },
  };
}

// Colours the phone's status bar to match the forest-green header.
export const viewport: Viewport = {
  themeColor: "#1e4428",
  colorScheme: "light",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The language decides lang/dir on <html>: with dir="rtl" the browser mirrors
  // every flex and grid row, and the site's start/end (logical) classes follow.
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      dir={dirOf(locale)}
      className={`${notoSans.variable} ${notoSansArabic.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <I18nProvider locale={locale}>{children}</I18nProvider>
        {/* Cookie-free visitor counts (Vercel Web Analytics). Needs switching
            on once in the Vercel dashboard: Project → Analytics → Enable. */}
        <Analytics />
      </body>
    </html>
  );
}
