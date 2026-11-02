/**
 * What the shipped Kinetix theme actually is — the floor every resolve starts from.
 *
 * Three kinds of shipped value live here, and they come from the generated tokens in different ways for
 * a reason worth stating rather than discovering:
 *
 *   colours   TOKEN_CONTRACT, a hand-written table. The generated `@kinetixui/tokens` object carries the
 *             LIGHT theme only — dark exists solely as HSL channels in globals.dark.css — so a table is
 *             the only place both modes are stated as hex. It is not a second truth: `check:token-contract`
 *             resolves every row against tokens/semantic/color.{light,dark}.json on every CI run and fails
 *             on any drift. The table moved here from apps/web with that gate pointed at its new path.
 *
 *   radius    read straight from `@kinetixui/tokens`. Generated, so there is nothing to keep in step.
 *
 *   elevation read straight from `@kinetixui/tokens` — the same DTCG data style-dictionary compiles
 *             `extras.css` from. `shadow-ladder.test.ts` asserts the strings this produces are identical
 *             to that stylesheet's, which is what keeps "one source" true rather than merely intended.
 *
 * Everything here is plain data. No DOM, no React, no CSS parsing.
 */
import tokens from "@kinetixui/tokens";

export const TOKEN_CONTRACT: TokenRow[] = [
  { token: "background", light: "#ffffff", dark: "#0c1229" },
  { token: "foreground", light: "#17233d", dark: "#f6f7fc" },
  { token: "card", light: "#ffffff", dark: "#1c2945", note: "synthesized" },
  { token: "popover", light: "#ffffff", dark: "#1c2945", note: "synthesized" },
  { token: "primary", light: "#5143db", dark: "#bbb3ff", note: "accessible action step; identity stays on brand" },
  { token: "primary-foreground", light: "#f6f7fc", dark: "#0c1229" },
  { token: "secondary", light: "#c7cfc7", dark: "#2e362e" },
  { token: "secondary-foreground", light: "#465245", dark: "#e3e7e3" },
  { token: "muted", light: "#f6f6f6", dark: "#283656" },
  { token: "muted-foreground", light: "#6d6d6d", dark: "#d4daec" },
  { token: "surface-grouped", light: "#f6f6f6", dark: "#111b35", note: "grouped section under a card" },
  { token: "accent", light: "#f0eeff", dark: "#283656" },
  { token: "accent-foreground", light: "#5143db", dark: "#f6f7fc" },
  { token: "destructive", light: "#c60a0a", dark: "#e89999", note: "stepped for AA on the Kinetic Weave dark surfaces" },
  { token: "success", light: "#5d6d5c", dark: "#90a08f" },
  { token: "warning", light: "#7f5b21", dark: "#ffc975", note: "darkened for AA" },
  { token: "border", light: "#92b2c8", dark: "#4a5673" },
  { token: "ring", light: "#5143db", dark: "#bbb3ff", note: "synthesized" },
  // Role tokens layered over primary / ring (added after the shadcn-compatible set on purpose: the
  // first row for a given hex names it in tokenNameForHex, so `primary` stays the label).
  { token: "brand", light: "#6054f4", dark: "#a78bfa", note: "identity — Kinetic Weave indigo / violet" },
  { token: "brand-foreground", light: "#f6f7fc", dark: "#0c1229" },
  { token: "action", light: "#5143db", dark: "#bbb3ff", note: "defaults to primary" },
  { token: "action-foreground", light: "#f6f7fc", dark: "#0c1229", note: "defaults to primary-foreground" },
  { token: "action-hover", light: "#6256df", dark: "#aaa3ea", note: "action @ 90% — native" },
  { token: "action-pressed", light: "#6b5fe0", dark: "#a19bdf", note: "action @ 85% — native" },
  { token: "link", light: "#5143db", dark: "#bbb3ff", note: "defaults to primary" },
  { token: "focus", light: "#5143db", dark: "#bbb3ff", note: "defaults to ring" },
];

export type TokenRow = { token: string; light: string; dark: string; note?: string };

/**
 * Roles that default to another role, exactly as the token source states it: `color.action` is
 * `{color.primary}`, `color.link` is `{color.primary}`, `color.action-foreground` is
 * `{color.primary-foreground}`, `color.focus` is `{color.ring}` — in light and in dark.
 * `contract.test.ts` reads tokens/semantic/color.{light,dark}.json and fails if this drifts.
 *
 * This is the one rule for what pinning `primary` or `ring` means, and the resolver applies it so every
 * output agrees. On the web the rule was already true by accident of the cascade (`--action:
 * var(--primary)`), while the scoped preview and the three native exporters write every role as a value
 * and so never followed — one design, three themes (audit P1-3). A role the user pinned itself still wins.
 */
export const ROLE_DEFAULTS = {
  action: "primary",
  "action-foreground": "primary-foreground",
  link: "primary",
  focus: "ring",
} as const;

/** hex (case-insensitive) -> the semantic token it backs, light theme. Built from TOKEN_CONTRACT above. */
export function tokenNameForHex(hex: string): string | undefined {
  const h = hex.toLowerCase();
  return TOKEN_CONTRACT.find((r) => r.light.toLowerCase() === h)?.token;
}

/* ------------------------------------------------------------------ non-colour shipped values */

export const RADIUS_STEP_NAMES = ["sm", "md", "lg", "xl"] as const;
export type RadiusStep = (typeof RADIUS_STEP_NAMES)[number];

export const ELEVATION_STEP_NAMES = ["sm", "md", "lg", "xl"] as const;
export type ElevationStep = (typeof ELEVATION_STEP_NAMES)[number];

/** One shadow, as the token data states it: unitless numbers and a colour, not a CSS string. */
export type ShadowLayer = { color: string; offsetX: string; offsetY: string; blur: string; spread: string };

const px = (value: string) => Number(value.replace("px", ""));

/** The shipped radius ladder, in px. 4 / 8 / 12 / 16 — and read, not restated. */
export const SHIPPED_RADIUS: Record<RadiusStep, number> = {
  sm: px(tokens.radius.sm),
  md: px(tokens.radius.md),
  lg: px(tokens.radius.lg),
  xl: px(tokens.radius.xl),
};

const SHADOWS = tokens.shadow as unknown as Record<string, ShadowLayer[]>;

/** The shipped elevation ladder, as layers. An empty list means "no shadow". */
export const SHIPPED_ELEVATION: Record<ElevationStep, ShadowLayer[]> = {
  sm: SHADOWS.sm!,
  md: SHADOWS.md!,
  lg: SHADOWS.lg!,
  xl: SHADOWS.xl!,
};
