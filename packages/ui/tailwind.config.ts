import type { Config } from "tailwindcss";

/**
 * Maps Tailwind color/radius utilities onto the KinetixUI semantic token contract
 * (packages/tokens/dist/web/globals.css). Consumers import that CSS once, then
 * use `bg-primary`, `text-muted-foreground`, `rounded-md`, etc.
 */
export default {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../apps/**/*.{ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: "var(--font-sans)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },
        popover: { DEFAULT: "var(--popover)", foreground: "var(--popover-foreground)" },
        primary: { DEFAULT: "var(--primary)", foreground: "var(--primary-foreground)" },
        secondary: { DEFAULT: "var(--secondary)", foreground: "var(--secondary-foreground)" },
        muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
        accent: { DEFAULT: "var(--accent)", foreground: "var(--accent-foreground)" },
        destructive: { DEFAULT: "var(--destructive)", foreground: "var(--destructive-foreground)" },
        success: { DEFAULT: "var(--success)", foreground: "var(--success-foreground)" },
        warning: { DEFAULT: "var(--warning)", foreground: "var(--warning-foreground)" },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        full: "var(--radius-full)",
      },
      spacing: {
        1: "var(--spacing-1)", 2: "var(--spacing-2)", 3: "var(--spacing-3)", 4: "var(--spacing-4)",
        5: "var(--spacing-5)", 6: "var(--spacing-6)", 7: "var(--spacing-7)", 8: "var(--spacing-8)",
      },
    },
  },
  plugins: [],
} satisfies Config;
