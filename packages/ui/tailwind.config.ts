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
      // Material-3 type scale — `text-body-md`, `text-headline-lg`, … each carries
      // its line-height, tracking and weight. Mirrors tokens/semantic/typography.json.
      fontSize: {
        "display-lg": ["57px", { lineHeight: "64px", letterSpacing: "-0.25px", fontWeight: "500" }],
        "display-md": ["45px", { lineHeight: "52px", letterSpacing: "0", fontWeight: "500" }],
        "display-sm": ["36px", { lineHeight: "44px", letterSpacing: "0", fontWeight: "400" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "0", fontWeight: "600" }],
        "headline-md": ["28px", { lineHeight: "36px", letterSpacing: "0", fontWeight: "400" }],
        "headline-sm": ["24px", { lineHeight: "32px", letterSpacing: "0", fontWeight: "400" }],
        "title-lg": ["22px", { lineHeight: "28px", letterSpacing: "0", fontWeight: "400" }],
        "title-md": ["16px", { lineHeight: "24px", letterSpacing: "0.15px", fontWeight: "500" }],
        "title-sm": ["14px", { lineHeight: "20px", letterSpacing: "0.1px", fontWeight: "500" }],
        "title-dialog": ["18px", { lineHeight: "24px", letterSpacing: "0", fontWeight: "600" }],
        "label-lg": ["14px", { lineHeight: "20px", letterSpacing: "0.1px", fontWeight: "500" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.5px", fontWeight: "500" }],
        "label-sm": ["11px", { lineHeight: "16px", letterSpacing: "0.5px", fontWeight: "500" }],
        "body-lg": ["16px", { lineHeight: "24px", letterSpacing: "0.5px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", letterSpacing: "0.25px", fontWeight: "400" }],
        "body-sm": ["12px", { lineHeight: "16px", letterSpacing: "0", fontWeight: "400" }],
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-md)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        focus: "var(--shadow-focus)",
        "focus-destructive": "var(--shadow-focus-destructive)",
        "focus-success": "var(--shadow-focus-success)",
        "focus-warning": "var(--shadow-focus-warning)",
        none: "none",
      },
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
        info: { DEFAULT: c("--info"), foreground: c("--info-foreground") },
        tertiary: { DEFAULT: c("--tertiary"), foreground: c("--tertiary-foreground") },
        border: c("--border"),
        input: c("--input"),
        ring: c("--ring"),
        chart: {
          1: c("--chart-1"),
          2: c("--chart-2"),
          3: c("--chart-3"),
          4: c("--chart-4"),
          5: c("--chart-5"),
          6: c("--chart-6"),
          7: c("--chart-7"),
          8: c("--chart-8"),
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
