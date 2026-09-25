import type { Metadata, Viewport } from "next";
import { Fustat, Geologica } from "next/font/google";
import "./globals.css";

// Body text. Latin only — Geologica has no Arabic glyphs at all.
const geologica = Geologica({
  variable: "--font-geologica",
  subsets: ["latin"],
  display: "swap",
});

// Headings, and the fallback for every Arabic character on the site.
const fustat = Fustat({
  variable: "--font-fustat",
  subsets: ["latin", "arabic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "El-Salam Scouting Group",
    template: "%s · El-Salam Scouting Group",
  },
  description:
    "El-Salam Scouting Group — over 400 scouts, leaders and families building character, service and friendship since 1977.",
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
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
