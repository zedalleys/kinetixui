import type { Config } from "tailwindcss";
import preset from "../../packages/ui/tailwind.config";

export default {
  presets: [preset],
  content: [
    "./.storybook/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
} satisfies Config;
