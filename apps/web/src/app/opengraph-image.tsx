import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

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
const FOREGROUND = "#050c11"; // --foreground
const ACTION = "#1d4ed8"; // --action / --primary
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
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 12,
              background: ACTION,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: BACKGROUND,
              fontSize: 38,
              fontWeight: 700,
            }}
          >
            K
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: 6, textTransform: "uppercase" }}>
            {siteConfig.name}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1, letterSpacing: -2 }}>
            {siteConfig.tagline}
          </div>
          <div style={{ fontSize: 30, color: MUTED, lineHeight: 1.4 }}>
            React · SwiftUI · Jetpack Compose · Flutter
          </div>
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
