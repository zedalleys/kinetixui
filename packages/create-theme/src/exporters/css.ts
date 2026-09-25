/**
 * The web CSS exporter — the theme as a drop-in override block.
 *
 * Only what differs from the shipped theme. A full dump of every token would be mostly the values the
 * consumer already has, and a reader could not see what they changed. Diffing also makes the default case
 * honest: no change, no CSS.
 *
 * Colours are emitted as HSL channels because that is the shape `hsl(var(--x))` expects throughout
 * @kinetixui/ui — the internal model is OKLCH, the output format is the one the library reads. This is
 * the only file in the package that knows either of those things; that is the point of it being a
 * separate file rather than a method on the theme.
 *
 * What it will not emit, whatever the preset says: a property name that is not a known token, a comment
 * carrying user input, the preset payload, or anything resembling native code. The token allowlist lives
 * in the codec and has already refused everything else before a theme exists (§25).
 */
import { hexToHslChannels } from "../color-math";
import {
  ELEVATION_STEP_NAMES,
  RADIUS_STEP_NAMES,
  type ShadowLayer,
} from "../contract";
import { SHIPPED_THEME, type ResolvedCreateTheme, type ResolvedThemeMode } from "../resolve";
import type { ThemeExporter } from "./index";

export type CssExportOptions = {
  /** The light-mode selector. Defaults to `:root`. */
  rootSelector?: string;
  /** The dark-mode selector. Defaults to `.dark`, which is what @kinetixui/ui toggles. */
  darkSelector?: string;
};

export const NOTHING_TO_OVERRIDE =
  "/* Nothing to override — this is the Kinetix default.\n   Change a control above and the CSS appears here. */";

/** `0` rather than `0px` for a zero offset — the shape the generated stylesheet already uses. */
const px = (value: string) => (Number(value) === 0 ? "0" : `${value}px`);

/** Shadow layers as one CSS `box-shadow` value. The empty list is `none`, not an empty string. */
export function shadowCss(layers: ShadowLayer[]): string {
  if (layers.length === 0) return "none";
  return layers.map((l) => `${px(l.offsetX)} ${px(l.offsetY)} ${px(l.blur)} ${px(l.spread)} ${l.color}`).join(", ");
}

const declaration = (token: string, value: string) => `  --${token}: ${value};`;

const block = (selector: string, lines: string[]) =>
  lines.length ? `${selector} {\n${lines.join("\n")}\n}` : "";

/** The colour declarations that differ from the shipped theme for this mode, name-sorted. */
function colorLines(resolved: ResolvedThemeMode, base: ResolvedThemeMode): string[] {
  return Object.keys(resolved.colors)
    .filter((token) => {
      const value = resolved.colors[token];
      return value && value.toLowerCase() !== base.colors[token]?.toLowerCase();
    })
    .sort()
    .map((token) => declaration(token, hexToHslChannels(resolved.colors[token]!)));
}

/**
 * The non-colour custom properties that differ from the shipped ladders, as CSS values.
 *
 * Exported because the workspace's scoped preview needs exactly this set: it writes the same overrides
 * inline on a wrapper element, and two rules for "which vars does this design change" would be two
 * chances for the preview and the copied CSS to disagree — which is the class of bug Elevated was.
 *
 * `--shadow-*` carries the literal layers of whichever rung the treatment chose, never `var(--shadow-md)`.
 * Custom properties substitute at computed-value time, so co-declared aliases resolve against each other
 * and the whole ladder collapses onto its top rung — a bug this shipped once and will not again, because
 * the resolved theme has no way to express a reference (see `deriveElevation`).
 */
export function cssVarOverrides(
  resolved: ResolvedThemeMode,
  base: ResolvedThemeMode = SHIPPED_THEME.light,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const step of RADIUS_STEP_NAMES) {
    if (resolved.radius[step] !== base.radius[step]) out[`radius-${step}`] = `${resolved.radius[step]}px`;
  }
  for (const step of ELEVATION_STEP_NAMES) {
    const value = shadowCss(resolved.elevation[step]);
    if (value !== shadowCss(base.elevation[step])) out[`shadow-${step}`] = value;
  }
  return out;
}

const varLines = (resolved: ResolvedThemeMode, base: ResolvedThemeMode): string[] =>
  Object.entries(cssVarOverrides(resolved, base)).map(([token, value]) => declaration(token, value));

/**
 * Radius and elevation do not vary by mode, so they belong in the root block once. The only mode-varying
 * non-colour case would be a shadow that referenced a colour token, and none of them do — so a dark
 * block that repeated them would be noise a reader has to diff by eye.
 */
export function exportCss(theme: ResolvedCreateTheme, options: CssExportOptions = {}): string {
  const rootSelector = options.rootSelector ?? ":root";
  const darkSelector = options.darkSelector ?? ".dark";

  const rootVars = varLines(theme.light, SHIPPED_THEME.light);
  const root = [...colorLines(theme.light, SHIPPED_THEME.light), ...rootVars];
  const dark = [
    ...colorLines(theme.dark, SHIPPED_THEME.dark),
    ...varLines(theme.dark, SHIPPED_THEME.dark).filter((line) => !rootVars.includes(line)),
  ];

  return [block(rootSelector, root), block(darkSelector, dark)].filter(Boolean).join("\n\n");
}

export const cssExporter: ThemeExporter<CssExportOptions, string> = {
  target: "web-css",
  label: "Web CSS",
  export: exportCss,
};
