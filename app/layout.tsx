import type { Metadata, Viewport } from "next";
import { Fustat, Geologica } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SITE_URL } from "@/lib/site-url";
import "./globals.css";

// Body text. Latin only — Geologica has no Arabic glyphs at all.
const geologica = Geologica({
  variable: "--font-geologica",
  subsets: ["latin"],
  display: "swap",
});

// Headings. (The site is English-only for now; add the "arabic" subset
// back here when an Arabic version is built.)
const fustat = Fustat({
  variable: "--font-fustat",
  subsets: ["latin"],
  display: "swap",
});

const DESCRIPTION =
  "El-Salam Scouting Group — over 400 scouts, leaders and families building character, service and friendship since 1977.";

export const metadata: Metadata = {
  // Makes the share image and canonical links absolute URLs.
  metadataBase: new URL(SITE_URL),
  applicationName: "El-Salam Scouts",
  title: {
    default: "El-Salam Scouting Group",
    template: "%s · El-Salam Scouting Group",
  },
  description: DESCRIPTION,
  // What WhatsApp, Facebook and X show when a link is shared. The picture
  // itself is app/opengraph-image.jpg, which Next picks up by its name.
  openGraph: {
    type: "website",
    siteName: "El-Salam Scouting Group",
    title: "El-Salam Scouting Group",
    locale: "en_US",
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
};

// Colours the phone's status bar to match the forest-green header.
export const viewport: Viewport = {
  themeColor: "#1e4428",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geologica.variable} ${fustat.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        {children}
        {/* Cookie-free visitor counts (Vercel Web Analytics). Needs switching
            on once in the Vercel dashboard: Project → Analytics → Enable. */}
        <Analytics />
      </body>
    </html>
  );
}
