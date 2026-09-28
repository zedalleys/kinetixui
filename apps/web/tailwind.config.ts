import type { Config } from "tailwindcss";
import preset from "../../packages/ui/tailwind.config";

export default {
  presets: [preset],
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx,md,mdx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
    "../../packages/ui/dist/**/*.js",
    // @kinetixui/iot styles itself with Tailwind utilities on the token contract rather than importing
    // anything, which is why its README lists being inside the consuming app's content globs as a
    // prerequisite. /iot renders the real primitives, so the site has to satisfy that documented
    // requirement — without this line every class the five primitives emit is purged and they render
    // unstyled. Source only: the class strings are literals under src, so there is no reason to couple
    // the site's CSS to a build of the package's dist.
    "../../packages/iot/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // site-only helpers layered on top of the @kinetixui/ui preset
      fontFamily: {
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        "reveal-up": { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        marquee: "marquee var(--marquee-duration, 32s) linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
