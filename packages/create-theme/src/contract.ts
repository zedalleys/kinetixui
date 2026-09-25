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
  { token: "background", light: "#ffffff", dark: "#050c11" },
  { token: "foreground", light: "#050c11", dark: "#f0f7ff" },
  { token: "card", light: "#ffffff", dark: "#0b1821", note: "synthesized" },
  { token: "popover", light: "#ffffff", dark: "#0b1821", note: "synthesized" },
  { token: "primary", light: "#1d4ed8", dark: "#60a5fa" },
  { token: "primary-foreground", light: "#f0f7ff", dark: "#050c11" },
  { token: "secondary", light: "#c7cfc7", dark: "#2e362e" },
  { token: "secondary-foreground", light: "#465245", dark: "#e3e7e3" },
  { token: "muted", light: "#f6f6f6", dark: "#102432" },
  { token: "muted-foreground", light: "#6d6d6d", dark: "#92b2c8" },
  { token: "accent", light: "#f0f7ff", dark: "#102432" },
  { token: "accent-foreground", light: "#1d4ed8", dark: "#f0f7ff" },
  { token: "destructive", light: "#c60a0a", dark: "#dd6a6a", note: "darkened for AA" },
  { token: "success", light: "#5d6d5c", dark: "#90a08f" },
  { token: "warning", light: "#7f5b21", dark: "#ffc975", note: "darkened for AA" },
  { token: "border", light: "#92b2c8", dark: "#395a70" },
  { token: "ring", light: "#1d4ed8", dark: "#60a5fa", note: "synthesized" },
  // Role tokens layered over primary / ring (added after the shadcn-compatible set on purpose: the
  // first row for a given hex names it in tokenNameForHex, so `primary` stays the label).
  { token: "brand", light: "#1b3c53", dark: "#7495ab", note: "identity — the Figma navy" },
  { token: "brand-foreground", light: "#f0f7ff", dark: "#050c11" },
  { token: "action", light: "#1d4ed8", dark: "#60a5fa", note: "defaults to primary" },
  { token: "action-foreground", light: "#f0f7ff", dark: "#050c11", note: "defaults to primary-foreground" },
  { token: "action-hover", light: "#3460dc", dark: "#5796e3", note: "action @ 90% — native" },
  { token: "action-pressed", light: "#3f69de", dark: "#528ed7", note: "action @ 85% — native" },
  { token: "link", light: "#1d4ed8", dark: "#60a5fa", note: "defaults to primary" },
  { token: "focus", light: "#1d4ed8", dark: "#60a5fa", note: "defaults to ring" },
];

export type TokenRow = { token: string; light: string; dark: string; note?: string };

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
