/**
 * The harness's Tailwind config: the package's own preset, with the harness and the package's source as
 * content. It mirrors `apps/docs/tailwind.config.ts` so the utilities compiled here are the utilities
 * Storybook compiles — a gate measuring a different utility set would be measuring a different component.
 */
import type { Config } from "tailwindcss";
import preset from "../tailwind.config";

export default {
  presets: [preset],
  content: ["./*.{html,tsx}", "../src/**/*.{ts,tsx}"],
} satisfies Config;
