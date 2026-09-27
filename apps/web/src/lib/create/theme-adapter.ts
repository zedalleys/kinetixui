/**
 * The workspace's view of a resolved theme.
 *
 * All of the derivation lives in `@kinetixui/create-theme` now, which takes a portable design and returns
 * a platform-neutral theme. This file adds only the three things a *browser workspace* needs and an
 * exporter must never see:
 *
 *   active   which of the two appearances is on screen — a preview control, not a design decision
 *   style    the resolved theme as inline custom properties for the scoped preview root
 *   contrast the readability report the sidebar shows
 *
 * Export output is deliberately NOT here. There is one resolved theme and four exporters that read it,
 * and which one a reader has selected is presentation state — see `export-targets.ts`. Generating all
 * four on every colour drag would be three files of work nobody asked to see.
 *
 * There is no second derivation here, and there must not be one: the moment this file computes a colour,
 * the website and `kinetixui preset css` can disagree about what a preset means.
 */
import {
  NOTHING_TO_OVERRIDE,
  contrastOf,
  cssVarOverrides,
  hexToHslChannels,
  hexToOklch,
  parsePaletteText,
  resolveCreateTheme,
  ACCEPTED_TOKENS,
  SHIPPED_COLORS,
  type AcceptedToken,
  type ContrastResult,
  type ParsedPalette,
  type ResolvedCreateTheme,
  type ResolvedThemeMode,
} from "@kinetixui/create-theme";
import { configToPreset } from "./preset";
import { type CreateConfig, type PreviewMode } from "./config";

export { NOTHING_TO_OVERRIDE };

/** The shipped contract per mode, for the sidebar's "this is the shipped value" affordances. */
export const SHIPPED_TOKENS: Record<PreviewMode, Record<string, string>> = SHIPPED_COLORS;

export type CreateTheme = ResolvedCreateTheme & {
  /** The appearance the preview is showing. */
  active: ResolvedThemeMode;
  /** Inline custom properties for the scoped preview root. */
  style: Record<string, string>;
  contrast: ContrastResult[];
  /** Tokens the user set by hand — shown as "manual" beside a contrast result. */
  manualTokens: Set<string>;
};

/**
 * Inline custom properties for the preview root.
 *
 * Colours are written in full — the preview is a scoped theme and has to define every token it uses, or
 * the page's own theme shows through. Radius and elevation are written only where the design changes
 * them, through the exporter's own rule, so a default workspace previews the real shipped ladders and
 * Reset genuinely leaves nothing behind.
 */
function previewStyle(mode: ResolvedThemeMode): Record<string, string> {
  const style: Record<string, string> = {};
  for (const [token, hex] of Object.entries(mode.colors)) {
    if (hex) style[`--${token}`] = hexToHslChannels(hex);
  }
  for (const [token, value] of Object.entries(cssVarOverrides(mode))) style[`--${token}`] = value;
  return style;
}

export function resolveTheme(config: CreateConfig): CreateTheme {
  const theme = resolveCreateTheme(configToPreset(config));
  const active = config.mode === "dark" ? theme.dark : theme.light;

  return {
    ...theme,
    active,
    style: previewStyle(active),
    contrast: contrastOf(active),
    manualTokens: new Set(theme.meta.manualTokens),
  };
}

/* ------------------------------------------------------------------ advanced editor bridge */

/** `token,hex` rows for the values the user has set by hand. The raw editor's initial text. */
export function overridesToText(overrides: Partial<Record<AcceptedToken, string>>): string {
  return (ACCEPTED_TOKENS as readonly AcceptedToken[])
    .filter((t) => overrides[t])
    .map((t) => `${t},${overrides[t]}`)
    .join("\n");
}

/** Parse raw editor text into overrides, keeping the parser's own error reporting. */
export function textToOverrides(text: string): ParsedPalette {
  return parsePaletteText(text);
}

/** The resolved value of a token in the active mode — what an Advanced field shows before it is set. */
export function effectiveValue(theme: CreateTheme, token: AcceptedToken): string {
  return theme.active.colors[token] ?? "#000000";
}

/** Perceptual lightness of the active background — used to pick readable swatch outlines. */
export function activeBackgroundLightness(theme: CreateTheme): number {
  return hexToOklch(theme.active.colors.background ?? "#ffffff")?.l ?? 1;
}
