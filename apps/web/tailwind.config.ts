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

      /**
       * Breakpoints measured in the reader's own text size rather than in device pixels.
       *
       * Tailwind's `sm`/`lg`/`xl` are `640px`/`1024px`/`1280px`, and a `px` media query cannot know
       * that the reader has doubled their default font size. A layout gated on one therefore commits
       * to a desktop composition on a 1280px screen whether the text in it is 16px or 32px — and a
       * column sized in `rem` doubles underneath that commitment. On /create that combination crushed
       * the preview: at 1280px/200% the two-column grid resolved to `[832px 256px]`, and inside the
       * 254px pane the scene still laid itself out as a desktop app, leaving its cards 2px wide.
       *
       * A `rem` media query *does* track that preference — verified in Chromium before these were
       * added: at 1280px with a 32px root, `min-width: 64rem` is false while `min-width: 1024px` is
       * still true, and at 2100px it is true again. So these ask the question the layout actually
       * needs answered — "is there room for this composition, in the units the reader reads in?" —
       * instead of "is the device wide?".
       *
       * The values are the default breakpoints converted at the default root size, so `sm-rem` is
       * `sm`, `lg-rem` is `lg` and `xl-rem` is `xl` for every reader who has not changed their font
       * size. Nothing moves at 100% text; they diverge only once the text grows, which is the only
       * case they exist for.
       */
      screens: {
        "sm-rem": "40rem",
        "lg-rem": "64rem",
        "xl-rem": "80rem",
      },

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
