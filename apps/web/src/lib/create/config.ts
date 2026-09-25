/**
 * Create's configuration state — the one authoritative model.
 *
 * Every control writes here and nothing else holds design state: there is no separate picker state, no
 * second copy of the theme in the preview, and the raw editor's text is UI draft state that commits into
 * `manualOverrides` rather than a rival source of truth (§41). `resolveTheme` is the only thing that turns
 * this into colours, and it is a pure function, so two people with the same config see the same theme.
 *
 * Serializable by construction: strings, plain objects, no functions, no Map, no computed CSS. The
 * portable half of it is exactly what `@kinetixui/create-preset` encodes; `mode` and `previewScene` are
 * the workspace's own presentation state and deliberately do not travel.
 *
 * `style` is deliberately NOT a field. It is derived from `radius` + `surface`, so selecting "Sharp" and
 * then changing the radius cannot leave a stale preset name behind — there is nothing to go stale (§20).
 */
import {
  ACCEPTED_TOKENS,
  KINETIX_BRAND,
  STYLE_VALUES,
  styleFor,
  type AcceptedToken,
  type ChartPaletteId,
  type NeutralId,
  type RadiusId,
  type StyleId,
  type SurfaceId,
} from "@kinetixui/create-theme";

/** Which preview the canvas renders. Both exist to show controls the other cannot. */
export const PREVIEW_SCENES = ["dashboard", "form"] as const;
export type PreviewScene = (typeof PREVIEW_SCENES)[number];

/** The appearance the PREVIEW renders in — independent of the visitor's own site theme. */
export type PreviewMode = "light" | "dark";

export type CreateConfig = {
  mode: PreviewMode;
  previewScene: PreviewScene;
  /** The one colour Simple mode asks for. Seeds brand, action, link and focus. */
  brand: string;
  neutral: NeutralId;
  radius: RadiusId;
  surface: SurfaceId;
  chartPalette: ChartPaletteId;
  /** Advanced: exact values that beat everything generated. Empty in the default config. */
  manualOverrides: Partial<Record<AcceptedToken, string>>;
};

export const DEFAULT_CREATE_CONFIG: CreateConfig = {
  mode: "light",
  previewScene: "dashboard",
  brand: KINETIX_BRAND,
  neutral: "kinetix",
  radius: "default",
  surface: "soft",
  chartPalette: "kinetix",
  manualOverrides: {},
};

export type CreateAction =
  | { type: "set-mode"; mode: PreviewMode }
  | { type: "set-scene"; scene: PreviewScene }
  | { type: "set-brand"; hex: string }
  | { type: "set-neutral"; neutral: NeutralId }
  | { type: "set-radius"; radius: RadiusId }
  | { type: "set-surface"; surface: SurfaceId }
  | { type: "set-chart"; palette: ChartPaletteId }
  | { type: "set-style"; style: StyleId }
  | { type: "set-override"; token: AcceptedToken; hex: string | null }
  | { type: "set-overrides"; values: Partial<Record<AcceptedToken, string>> }
  // Swap the whole configuration at once — a decoded preset, or a randomized design. Still one reducer:
  // the alternative is a second way to set state, and then two places that can disagree about it.
  | { type: "replace"; config: CreateConfig }
  | { type: "reset" };

export function createReducer(state: CreateConfig, action: CreateAction): CreateConfig {
  switch (action.type) {
    case "set-mode":
      return state.mode === action.mode ? state : { ...state, mode: action.mode };
    case "set-scene":
      return state.previewScene === action.scene ? state : { ...state, previewScene: action.scene };
    case "set-brand":
      return state.brand === action.hex ? state : { ...state, brand: action.hex };
    case "set-neutral":
      return state.neutral === action.neutral ? state : { ...state, neutral: action.neutral };
    case "set-radius":
      return state.radius === action.radius ? state : { ...state, radius: action.radius };
    case "set-surface":
      return state.surface === action.surface ? state : { ...state, surface: action.surface };
    case "set-chart":
      return state.chartPalette === action.palette ? state : { ...state, chartPalette: action.palette };
    case "set-style":
      // A style writes the dimensions it names and nothing else. Whatever the user changes afterwards
      // simply wins, and `currentStyle` stops naming a preset.
      return { ...state, ...STYLE_VALUES[action.style] };
    case "set-override": {
      const next = { ...state.manualOverrides };
      if (action.hex === null) delete next[action.token];
      else next[action.token] = action.hex;
      return { ...state, manualOverrides: next };
    }
    case "set-overrides":
      return { ...state, manualOverrides: { ...action.values } };
    case "replace":
      return action.config;
    case "reset":
      return DEFAULT_CREATE_CONFIG;
  }
}

/** The named style this config sits on, or null once it is a combination no preset describes. */
export function currentStyle(config: CreateConfig): StyleId | null {
  return styleFor(config.radius, config.surface);
}

/**
 * Whether anything has been customized.
 *
 * Field by field rather than `JSON.stringify` — key order is not guaranteed across engines, and an empty
 * `manualOverrides` written two different ways would otherwise compare unequal and leave Reset looking
 * enabled for nothing (§43).
 */
export function isDefaultConfig(config: CreateConfig): boolean {
  const d = DEFAULT_CREATE_CONFIG;
  return (
    config.mode === d.mode &&
    config.previewScene === d.previewScene &&
    config.brand.toLowerCase() === d.brand &&
    config.neutral === d.neutral &&
    config.radius === d.radius &&
    config.surface === d.surface &&
    config.chartPalette === d.chartPalette &&
    Object.keys(config.manualOverrides).length === 0
  );
}

/**
 * A stable string for a config — same config, same key, regardless of how the object was built.
 *
 * Used for memoization, and mirrors the canonical form the codec encodes. Keys are sorted so two
 * configs that differ only in insertion order produce one key.
 */
export function configKey(config: CreateConfig): string {
  const overrides = (ACCEPTED_TOKENS as readonly AcceptedToken[])
    .filter((t) => config.manualOverrides[t])
    .map((t) => `${t}:${config.manualOverrides[t]}`)
    .join(",");
  return [
    config.mode,
    config.previewScene,
    config.brand.toLowerCase(),
    config.neutral,
    config.radius,
    config.surface,
    config.chartPalette,
    overrides,
  ].join("|");
}

export type { AcceptedToken };
