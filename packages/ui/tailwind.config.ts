import type { Config } from "tailwindcss";

/**
 * Maps Tailwind utilities onto the KinetixUI semantic token contract
 * (packages/tokens/dist/web/globals.css). Colours are emitted as HSL channels
 * (`H S% L%`) so Tailwind's opacity modifiers work — `bg-primary/90`,
 * `ring-ring/40`, etc. Consumers import the token CSS once, then use
 * `bg-primary`, `text-muted-foreground`, `rounded-md`, ...
 */
const c = (v: string) => `hsl(var(${v}) / <alpha-value>)`;

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}", "../../apps/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: { sans: "var(--font-sans)" },
      colors: {
        background: c("--background"),
        foreground: c("--foreground"),
        card: { DEFAULT: c("--card"), foreground: c("--card-foreground") },
        popover: { DEFAULT: c("--popover"), foreground: c("--popover-foreground") },
        primary: { DEFAULT: c("--primary"), foreground: c("--primary-foreground") },
        secondary: { DEFAULT: c("--secondary"), foreground: c("--secondary-foreground") },
        muted: { DEFAULT: c("--muted"), foreground: c("--muted-foreground") },
        accent: { DEFAULT: c("--accent"), foreground: c("--accent-foreground") },
        destructive: { DEFAULT: c("--destructive"), foreground: c("--destructive-foreground") },
        success: { DEFAULT: c("--success"), foreground: c("--success-foreground") },
        warning: { DEFAULT: c("--warning"), foreground: c("--warning-foreground") },
        border: c("--border"),
        input: c("--input"),
        ring: c("--ring"),
        chart: {
          1: c("--chart-1"),
          2: c("--chart-2"),
          3: c("--chart-3"),
          4: c("--chart-4"),
          5: c("--chart-5"),
        },
        sidebar: {
          DEFAULT: c("--sidebar"),
          foreground: c("--sidebar-foreground"),
          primary: c("--sidebar-primary"),
          "primary-foreground": c("--sidebar-primary-foreground"),
          accent: c("--sidebar-accent"),
          "accent-foreground": c("--sidebar-accent-foreground"),
          border: c("--sidebar-border"),
          ring: c("--sidebar-ring"),
        },
      },
      borderColor: { DEFAULT: c("--border") },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "calc(var(--radius-lg) + 8px)",
        full: "var(--radius-full)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "caret-blink": { "0%,70%,100%": { opacity: "1" }, "20%,50%": { opacity: "0" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
