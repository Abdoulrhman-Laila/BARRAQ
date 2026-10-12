import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Cairo } from "next/font/google";
import { ThemeScript } from "@/components/providers/ThemeScript";
import { LOCALE_HEADER } from "@/lib/auth/cookies";
import "./globals.css";

const baraqFont = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-baraq",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"]
});

const TITLES = {
  // `default` is the full brand-qualified string, not just the page name:
  // unlike Student Web (whose base title is the brand name alone), a page
  // that renders with no title of its own here must already read
  // "لوحة الإدارة | برّاق" / "Admin Dashboard | برّاق", not bare
  // "لوحة الإدارة" -- `title.default` is used verbatim (never passed
  // through `title.template`) by any page that doesn't set its own title.
  ar: { default: "لوحة الإدارة | برّاق", description: "مركز القيادة والإدارة لمنصة برّاق التعليمية" },
  en: {
    default: "Admin Dashboard | برّاق",
    description: "Command and administration center for the Baraq education platform"
  }
} as const;

export async function generateMetadata(): Promise<Metadata> {
  // Same source as the locale this layout's own body uses below: resolved
  // by middleware into a request header, since the root layout sits above
  // the [locale] segment and has no route param of its own to read. Title
  // was previously a static `export const metadata`, so every page --
  // English included -- always rendered the Arabic title regardless of
  // which locale was actually being viewed.
  const locale = (await headers()).get(LOCALE_HEADER) === "en" ? "en" : "ar";
  const copy = TITLES[locale];

  return {
    metadataBase: new URL("https://dashboard.baraqapp.com"),
    // The brand name stays Arabic in the template even on English pages --
    // same convention the Student Web app already uses correctly for
    // "برّاق" regardless of locale.
    title: { default: copy.default, template: "%s | برّاق" },
    description: copy.description,
    robots: { index: false, follow: false },
    icons: {
      // The .ico itself comes from Next's file convention (app/favicon.ico,
      // auto-served at /favicon.ico and merged in automatically) -- the same
      // asset already verified correct for the Student Web app, reused here
      // rather than regenerated, for one consistent brand mark across both
      // apps. This PNG is the larger icon declaration (it already was);
      // apple-touch-icon reuses it too rather than inventing a new derived
      // asset.
      icon: "/brand/app_icon_round.png",
      apple: "/brand/app_icon_round.png"
    }
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "light dark" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Middleware resolved this already; the root layout is above [locale] and
  // has no segment of its own to read.
  const locale = (await headers()).get(LOCALE_HEADER) === "en" ? "en" : "ar";

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={baraqFont.variable}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className={baraqFont.className}>{children}</body>
    </html>
  );
}
