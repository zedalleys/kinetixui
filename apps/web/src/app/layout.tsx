import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { siteConfig } from "@/lib/site";
import "./globals.css";

/**
 * Fonts are served from this repository, not fetched from Google at build time.
 *
 * `next/font/google` downloads from `fonts.googleapis.com` during `next build`, which put every job
 * that builds this site — `build`, `axe`, and the Vercel deployment — behind a third-party network
 * call. That call failed twice (#253, #255) with
 * `TypeError: Cannot read properties of null (reading '1')` thrown inside the font loader, turning a
 * healthy tree into a red check. Vendoring the files removes the network from the build path.
 *
 * These are the exact variable `.woff2` files this site was already serving, in the same versions —
 * Inter 4.001, Space Grotesk 2.000, JetBrains Mono 2.211 — so the rendered type is unchanged. Only
 * the `latin` subset is vendored, which is measurably all this site uses: a scan of the built HTML
 * and every source file found no `latin-ext`, `cyrillic`, `greek` or `vietnamese` character. The
 * symbols that do appear outside `latin` (arrows, box-drawing, ⌘) are in none of those subsets and
 * already fall back to a system font.
 *
 * The `@font-face` declarations below mirror the ones `next/font/google` used to emit, weight for
 * weight, rather than widening to the fonts' full axis ranges. See `fonts/README.md` for provenance
 * and licensing.
 */
const sans = localFont({
  // One face across the whole axis, exactly as the Google loader declared it (`font-weight: 100 900`).
  src: [{ path: "./fonts/inter-latin.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-sans",
  display: "swap",
  adjustFontFallback: "Arial",
});

const display = localFont({
  // Three faces off one variable file — the same shape the loader emitted for weight: ["500","600","700"].
  src: [
    { path: "./fonts/space-grotesk-latin.woff2", weight: "500", style: "normal" },
    { path: "./fonts/space-grotesk-latin.woff2", weight: "600", style: "normal" },
    { path: "./fonts/space-grotesk-latin.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
  adjustFontFallback: "Arial",
});

const mono = localFont({
  src: [
    { path: "./fonts/jetbrains-mono-latin.woff2", weight: "400", style: "normal" },
    { path: "./fonts/jetbrains-mono-latin.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
  adjustFontFallback: "Arial",
});

// Text diagrams need the full face: the Latin subset does not include box-drawing glyphs.
const treeMono = localFont({
  src: "./fonts/jetbrains-mono-tree.woff2",
  variable: "--font-tree-mono",
  weight: "400",
  display: "block",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: { default: `${siteConfig.name} — ${siteConfig.tagline}`, template: `%s — ${siteConfig.name}` },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  // Every page inherits these; a page only overrides what differs (title/description do, via its own
  // `metadata` export, and Open Graph picks those up automatically from the resolved title/description).
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    url: siteConfig.url,
    locale: "en",
  },
  twitter: {
    // summary_large_image, with no site/creator handle: KinetixUI has no X account, and inventing one
    // would point people at someone else's profile.
    card: "summary_large_image",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${sans.variable} ${display.variable} ${mono.variable} ${treeMono.variable}`}
    >
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          >
            Skip to content
          </a>
          <div className="relative flex min-h-dvh flex-col">
            <SiteHeader />
            <main id="main-content" className="flex-1">
              {children}
            </main>
            <SiteFooter />
          </div>
        </ThemeProvider>
        <AnalyticsProvider />
      </body>
    </html>
  );
}
