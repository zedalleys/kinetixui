import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

/**
 * Maps Tailwind utilities onto the KinetixUI semantic token contract
 * (packages/tokens/dist/web/globals.css). Colours are emitted as HSL channels
 * (`H S% L%`) so Tailwind's opacity modifiers work — `bg-primary/90`,
 * `ring-ring/40`, etc. Consumers import the token CSS once, then use
 * `bg-primary`, `text-muted-foreground`, `rounded-md`, ...
 */
const c = (v: string) => `hsl(var(${v}) / <alpha-value>)`;

/**
 * `sm-rem:`, `lg-rem:` and `xl-rem:` — the `-rem` breakpoints, as variants rather than screens.
 *
 * They must not go in `theme.extend.screens`, and this is not a style preference. Tailwind 3.4
 * refuses to emit **any** `min-*` / `max-*` variant rule once the screen map mixes units, and it
 * does so silently: no warning, no error, the utility simply is not in the output. Adding three
 * `rem` entries beside Tailwind's `px` defaults is exactly that mixture.
 *
 * Measured with the Tailwind CLI on one stub carrying `max-md:hidden`, `min-[420px]:grid-cols-2`,
 * `md:flex` and `sm-rem:grid-cols-2`:
 *
 *   as `theme.extend.screens` — `max-md:hidden` 0 rules, `min-[420px]:grid-cols-2` 0 rules
 *                               (`md:flex` survives; plain responsive variants are unaffected)
 *   as variants, below        — all four emitted
 *
 * The cost was already being paid before this preset carried them: `min-[420px]:grid-cols-2` on
 * the blocks gallery (apps/web/src/app/blocks/blocks-gallery.tsx) emitted no rule in the built
 * site, so that grid never took its two-column step. `check:breakpoints` now fails if either half
 * of this regresses.
 *
 * Defined here as one object so a consumer reading the preset sees the constraint beside the
 * values rather than having to know it.
 *
 * Why these exist at all:
 *
 * Breakpoints measured in the reader's own text size rather than in device pixels.
 *
 * In the shared preset rather than in one app's config, so that every surface built from it —
 * the website, and Storybook via apps/docs — resolves the same breakpoint. While these lived only
 * in apps/web, Tailwind generated no rule for `sm-rem:` in the Storybook build, and a generated
 * story that used one rendered its narrow layout at every width with nothing reporting it.
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
const REM_BREAKPOINTS = {
  "sm-rem": "40rem",
  "lg-rem": "64rem",
  "xl-rem": "80rem",
} as const;

const remBreakpoints = plugin(({ addVariant }) => {
  for (const [name, width] of Object.entries(REM_BREAKPOINTS)) {
    addVariant(name, `@media (min-width: ${width})`);
  }
});

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}", "../../apps/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: { sans: "var(--font-sans)" },

      // The `-rem` breakpoints are registered as VARIANTS, in `plugins` below — never here as
      // `theme.screens`. Mixing units in the screen map silently deletes every `max-*` and
      // `min-[…]` rule from the consumer's build. The whole reason is at `remBreakpoints`.

      // Material-3 type scale — `text-body-md`, `text-headline-lg`, … each carries
      // its line-height, tracking and weight. Mirrors tokens/semantic/typography.json.
      //
      // Sizes and line-heights are rem so that text follows the reader's browser font-size setting;
      // the numbers are the canonical scale divided by the 16px root, so every step renders at exactly
      // its old pixel size at the default setting (14px -> 0.875rem) and grows from there. They are not
      // hand-maintained against the tokens any more: `check:type-scale` derives this table from
      // tokens/semantic/typography.json and fails if the two disagree, which is how the px values here
      // went on silently outliving the ones in globals.css.
      //
      // Letter-spacing stays in px deliberately. It is an optical constant of the typeface at a
      // reference size rather than a size a reader asked to change, the primitive tokens are shared
      // across steps so there is no one font size to make it relative to, and at 0.1-0.5px it is far
      // below the threshold where scaling it would be legible.
      fontSize: {
        "display-lg": ["3.5625rem", { lineHeight: "4rem", letterSpacing: "-0.25px", fontWeight: "500" }],
        "display-md": ["2.8125rem", { lineHeight: "3.25rem", letterSpacing: "0", fontWeight: "500" }],
        "display-sm": ["2.25rem", { lineHeight: "2.75rem", letterSpacing: "0", fontWeight: "400" }],
        "headline-lg": ["2rem", { lineHeight: "2.5rem", letterSpacing: "0", fontWeight: "600" }],
        "headline-md": ["1.75rem", { lineHeight: "2.25rem", letterSpacing: "0", fontWeight: "400" }],
        "headline-sm": ["1.5rem", { lineHeight: "2rem", letterSpacing: "0", fontWeight: "400" }],
        "title-lg": ["1.375rem", { lineHeight: "1.75rem", letterSpacing: "0", fontWeight: "400" }],
        "title-md": ["1rem", { lineHeight: "1.5rem", letterSpacing: "0.15px", fontWeight: "500" }],
        "title-sm": ["0.875rem", { lineHeight: "1.25rem", letterSpacing: "0.1px", fontWeight: "500" }],
        "title-dialog": ["1.125rem", { lineHeight: "1.5rem", letterSpacing: "0", fontWeight: "600" }],
        "label-lg": ["0.875rem", { lineHeight: "1.25rem", letterSpacing: "0.1px", fontWeight: "500" }],
        "label-md": ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.5px", fontWeight: "500" }],
        "label-sm": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.5px", fontWeight: "500" }],
        "body-lg": ["1rem", { lineHeight: "1.5rem", letterSpacing: "0.5px", fontWeight: "400" }],
        "body-md": ["0.875rem", { lineHeight: "1.25rem", letterSpacing: "0.25px", fontWeight: "400" }],
        "body-sm": ["0.75rem", { lineHeight: "1rem", letterSpacing: "0", fontWeight: "400" }],
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
        muted: {
          DEFAULT: c("--muted"),
          foreground: c("--muted-foreground"),
          // Secondary text on a tinted container (bg-primary/10, bg-destructive/10). `--muted-foreground`
          // is tuned against `--background` and `--muted`; a 10% tint drops it to 4.33:1.
          "on-container": c("--semantic-muted-on-container"),
        },
        // The grouped section raised content sits on (TOKENS.md, surface model). Not `muted`: dark `muted` is
        // lighter than `card`, so a card on it read as recessed.
        surface: { grouped: c("--surface-grouped") },
        accent: { DEFAULT: c("--accent"), foreground: c("--accent-foreground") },
        // Each status carries an `on-container` sibling for the same reason `info` does: the role itself is
        // tuned against the page, and a notice draws it on its own tint (`bg-success/15`, `bg-destructive/10`),
        // which eats the margin. `--muted` is the tightest surface those notices ship on and is what the
        // on-container values are tuned against. Measured by check:contrast's ALPHA_TEXT_PAIRS.
        destructive: {
          DEFAULT: c("--destructive"),
          foreground: c("--destructive-foreground"),
          "on-container": c("--on-destructive-container"),
        },
        success: {
          DEFAULT: c("--success"),
          foreground: c("--success-foreground"),
          "on-container": c("--on-success-container"),
        },
        warning: {
          DEFAULT: c("--warning"),
          foreground: c("--warning-foreground"),
          "on-container": c("--on-warning-container"),
        },
        info: {
          DEFAULT: c("--info"),
          foreground: c("--info-foreground"),
          // text on a tinted info surface (bg-info/10) — --info alone is 4.15:1 there. The top-level role
          // every platform shares; `--semantic-on-info-container` is its legacy alias.
          "on-container": c("--on-info-container"),
        },
        tertiary: { DEFAULT: c("--tertiary"), foreground: c("--tertiary-foreground") },
        // The modal backdrop. The role carries its own alpha (black at 40% light, 60% dark), so it is mapped
        // without `<alpha-value>`: `bg-scrim`, not `bg-scrim/40`.
        scrim: "hsl(var(--scrim))",
        // Role tokens layered over `primary` (which stays the shadcn-compatible source). `action`, `link`
        // and `focus` default to it, so a theme that only sets `--primary` still works; override them
        // individually to split the interactive colour, link colour and focus colour. `brand` is identity
        // (logos, headers), not a control colour.
        brand: { DEFAULT: c("--brand"), foreground: c("--brand-foreground") },
        action: {
          DEFAULT: c("--action"),
          foreground: c("--action-foreground"),
          // explicit states for native ports; on the web, hover/pressed derive from `action` (bg-action/90, /85)
          hover: c("--action-hover"),
          pressed: c("--action-pressed"),
        },
        link: c("--link"),
        focus: c("--focus"),
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
        // Role aliases (tokens/primitives/dimension.json) — theme one role without touching the size steps.
        // Additive: components still use the size utilities above and move to these incrementally.
        field: "var(--radius-field)",
        control: "var(--radius-control)",
        container: "var(--radius-container)",
        surface: "var(--radius-surface)",
      },
      // Motion + scale — tokens/primitives/{motion,opacity,z-index}.json.
      // Added alongside Tailwind's own numeric scales (z-10, opacity-50, …),
      // not replacing them — these are the token-backed semantic names.
      transitionDuration: {
        // `instant` is the press/toggle tier from tokens/primitives/motion.json. It was generated
        // into globals.css but never wired here, so the one duration meant for immediate feedback
        // was the one nobody could reach — components fell back to Tailwind's untokenised 150ms.
        instant: "var(--duration-instant)",
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        slow: "var(--duration-slow)",
        slower: "var(--duration-slower)",
      },
      transitionTimingFunction: {
        // overrides Tailwind's built-in `ease-linear` with the identical
        // cubic-bezier(0,0,1,1) value, now token-backed instead of hardcoded
        linear: "var(--easing-linear)",
        standard: "var(--easing-standard)",
        // Same gap as `instant`: enter/exit/emphasized are defined in the DTCG source and emitted
        // as CSS variables, but were unreachable from a class. Directional easing is the whole
        // point of the enter/exit pair — a surface that opens should decelerate and one that
        // closes should accelerate, and without these you cannot say that in a utility.
        enter: "var(--easing-enter)",
        exit: "var(--easing-exit)",
        emphasized: "var(--easing-emphasized)",
      },
      zIndex: {
        base: "var(--z-index-base)",
        raised: "var(--z-index-raised)",
        docked: "var(--z-index-docked)",
        focus: "var(--z-index-focus)",
        sticky: "var(--z-index-sticky)",
        overlay: "var(--z-index-overlay)",
      },
      opacity: {
        hidden: "var(--opacity-hidden)",
        disabled: "var(--opacity-disabled)",
        muted: "var(--opacity-muted)",
        visible: "var(--opacity-visible)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        // Collapsible is the same disclosure gesture as Accordion on a different Radix primitive, so
        // it reads its own measured height variable and is otherwise identical.
        "collapsible-down": { from: { height: "0" }, to: { height: "var(--radix-collapsible-content-height)" } },
        "collapsible-up": { from: { height: "var(--radix-collapsible-content-height)" }, to: { height: "0" } },
        "caret-blink": { "0%,70%,100%": { opacity: "1" }, "20%,50%": { opacity: "0" } },
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        "typing-dot": { "0%,60%,100%": { transform: "translateY(0)", opacity: "0.4" }, "30%": { transform: "translateY(-3px)", opacity: "1" } },
      },
      /**
       * Durations and easings come from the tokens, not from numbers typed here.
       *
       * `0.2s ease-out` happened to equal `--duration-fast` and to be the same curve as
       * `--easing-enter`, so the values were right and the provenance was not — a change to the token
       * would have moved every other transition in the system and left disclosure behind.
       *
       * Disclosure uses the directional pair the easing tokens exist for: opening decelerates
       * (`enter`), closing accelerates (`exit`). The fallbacks match the token values and exist
       * because `animation` is a shorthand — an undefined `var()` makes the whole declaration invalid,
       * which would mean no animation at all rather than an un-themed one. `marquee` already
       * establishes that pattern below.
       *
       * `caret-blink` and `typing-dot` keep their literal timings. They are looping affordances
       * rather than state transitions, their rhythms were chosen for their own reasons, and
       * `scripts/a11y-animations.mjs` documents caret-blink at 1.25s by name. Retiming them to the
       * nearest token would change how they look to buy consistency nobody asked for, which is a
       * separate decision from giving disclosure its provenance back.
       */
      animation: {
        "accordion-down": "accordion-down var(--duration-fast, 200ms) var(--easing-enter, cubic-bezier(0, 0, 0.2, 1))",
        "accordion-up": "accordion-up var(--duration-fast, 200ms) var(--easing-exit, cubic-bezier(0.4, 0, 1, 1))",
        "collapsible-down": "collapsible-down var(--duration-fast, 200ms) var(--easing-enter, cubic-bezier(0, 0, 0.2, 1))",
        "collapsible-up": "collapsible-up var(--duration-fast, 200ms) var(--easing-exit, cubic-bezier(0.4, 0, 1, 1))",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        marquee: "marquee var(--marquee-duration, 32s) linear infinite",
        "typing-dot": "typing-dot 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    remBreakpoints,
    /**
 * Reduced motion, for everything this package ships.
 *
 * `packages/ui` ships no CSS of its own — components are class strings and consumers extend
 * this config — so this base layer is the only place a library-wide guarantee can live.
 * It is needed: `tailwindcss-animate` emits no `prefers-reduced-motion` rule at all, so every
 * `animate-in` / `animate-out` on Dialog, Sheet, Popover, Dropdown, Tooltip and the rest ran at
 * full motion in a consumer's app regardless of the operating-system setting.
 *
 * It shortens durations rather than removing motion, and that distinction is the safety
 * property. `transition-duration: 0.01ms` still arrives at the same end state, so a Switch
 * thumb is still translated, a checked box is still checked, and an IoT control still shows
 * confirmed rather than requested — the interpolation goes, the information does not. That is
 * what makes a blanket rule safe here, where `transition: none` would be a blunter instrument
 * and `animation: none` an actively dangerous one: Radix unmounts an overlay on `animationend`,
 * and an animation that never runs never fires it, so the overlay would stay in the tree.
 *
 * Components that need more than this still say so at their own call site with
 * `motion-reduce:`, and `packages/iot` already does exactly that where a pulse or a bar carries
 * meaning. This is the floor, not a replacement for that.
     */
    ({ addBase }: { addBase: (styles: Record<string, unknown>) => void }) => {
      addBase({
        "@media (prefers-reduced-motion: reduce)": {
          "*, ::before, ::after": {
            "animation-duration": "0.01ms !important",
            "animation-iteration-count": "1 !important",
            "transition-duration": "0.01ms !important",
            "scroll-behavior": "auto !important",
          },
        },
      });
    },
  ],
} satisfies Config;
