import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
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

      /* The `-rem` breakpoints this page's layouts are gated on live in the shared preset
         (packages/ui/tailwind.config.ts), not here. They were here, which meant Storybook — built from
         apps/docs against that same preset — generated no CSS for them at all, so a generated story using
         one silently rendered its narrow layout at every width. */

      /**
       * Website-only type roles that the canonical scale (packages/ui/tailwind.config.ts, from
       * tokens/semantic/typography.json) does not have and should not grow for. Each exists because the site
       * repeated the same px literal for one purpose; `check:typography` keeps them relative and keeps this list
       * from growing without a reason written next to the entry.
       *
       * - `code`: source in code blocks, token tables and fences. 13px sits between body-sm and body-md on
       *   purpose — monospace at 14px wraps or scrolls far more often in a docs column, and at 12px it is
       *   harder to read than the prose around it. Matches the rehype-pretty-code size in globals.css.
       * - `wordmark`: the KinetixUI lockup in the header and footer — brand, not a text role.
       */
      fontSize: {
        code: ["0.8125rem", { lineHeight: "1.25rem" }],
        wordmark: ["0.9375rem", { lineHeight: "1.25rem" }],
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
  plugins: [
    /**
     * `coarse:` — a touch-sized variant for controls whose desktop size is deliberately compact (filter chips, tabs).
     * Same media query as `.kx-hit` in globals.css, so a control grows on a phone or tablet held by a finger and
     * keeps its density under a mouse.
     */
    plugin(({ addVariant }) => {
      addVariant("coarse", "@media (pointer: coarse), (max-width: 639px)");
    }),
  ],
} satisfies Config;
