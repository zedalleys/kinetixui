import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";
import { PLATFORMS, PLATFORM_DEFINITIONS } from "@/lib/platform-parity";

/**
 * The platform strip, DERIVED from the manifest rather than typed.
 *
 * It read "React · SwiftUI · Jetpack Compose · Flutter" — four platforms, omitting Angular, which has been
 * published on npm for months. `site.ts`'s own description carries a comment about exactly this mistake
 * ("it named four platforms for weeks after Angular shipped"); the fix never reached the social card,
 * because no guard could see this file. A shared link is the first thing many people see, so it is the
 * worst surface on which to under-count the product.
 */
const platformStrip = PLATFORMS.map((p) => PLATFORM_DEFINITIONS[p].label).join(" \u00b7 ");

/**
 * The social sharing card for every page that doesn't define its own (the whole site today).
 *
 * Built with `next/og`, which ships with Next — no new dependency, no checked-in binary to redraw when the
 * brand moves. It is rendered once at build time into a static PNG. Colours are the resolved light-theme
 * token values rather than `var(--…)`: Satori (inside ImageResponse) has no stylesheet and cannot resolve
 * custom properties. `check:token-contract` keeps the token table honest; these four are spot values for one
 * image, so they are written out with the token each mirrors.
 */
export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BACKGROUND = "#ffffff"; // --background
const FOREGROUND = "#17233D"; // --foreground
const BRAND = "#6054F4"; // --brand (identity indigo). The mark is identity, not an interactive affordance,
// so it carries `brand` rather than `action` (#5143db) — see design-assets/identity/v1/README.md.
const MUTED = "#6d6d6d"; // --muted-foreground

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BACKGROUND,
          color: FOREGROUND,
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="64" height="64" viewBox="0 0 100 100" fill="none">
            <rect x="14" y="12" width="21" height="76" rx="10.5" fill={BRAND} />
            <path d="M38 50 L79 82" stroke="#28C7D9" strokeWidth="22" strokeLinecap="round" />
            <path d="M22 78 L78 21" stroke="#A78BFA" strokeWidth="22" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>
            {siteConfig.name}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1, letterSpacing: -2 }}>
            {siteConfig.tagline}
          </div>
          <div style={{ fontSize: 30, color: MUTED, lineHeight: 1.4 }}>{platformStrip}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: MUTED }}>
          <div>kinetixui.com</div>
          <div>MIT licensed</div>
        </div>
      </div>
    ),
    size,
  );
}
