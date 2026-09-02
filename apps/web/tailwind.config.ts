import type { Config } from "tailwindcss";
import preset from "../../packages/ui/tailwind.config";

export default {
  presets: [preset],
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx,md,mdx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
    "../../packages/ui/dist/**/*.js",
  ],
  theme: {
    extend: {
      // site-only helpers layered on top of the @kinetixui/ui preset
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
