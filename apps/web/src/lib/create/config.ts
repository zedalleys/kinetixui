/**
 * Create's configuration state.
 *
 * One typed object for the whole workspace, so a control added in a later PR extends this type rather
 * than adding another `useState` somewhere in the tree. The rule the shape follows: a field exists here
 * only when something reads it today. Modelling `radius`, `density`, `typography` or `chartPalette` now
 * would put defaults in the state that nothing applies, and a default nothing applies is indistinguishable
 * from a bug until someone tries to use it.
 *
 * `themeInput` is the raw `token,hex` text the existing theme engine parses (lib/theme-builder.ts). It is
 * the customization method for this PR; the colour controls that will eventually write into the same
 * config are PR 2's work, and they replace how values are *entered*, not what is stored.
 */
import type { AcceptedToken } from "../theme-builder";

/** Which preview the canvas renders. One today; the switch point exists so a second needs no new plumbing. */
export const PREVIEW_SCENES = ["dashboard"] as const;
export type PreviewScene = (typeof PREVIEW_SCENES)[number];

/** The appearance the PREVIEW renders in — deliberately independent of the visitor's own site theme. */
export type PreviewMode = "light" | "dark";

export type CreateConfig = {
  mode: PreviewMode;
  /** Raw `token,hex` rows. Empty means "the Kinetix default, unmodified". */
  themeInput: string;
  previewScene: PreviewScene;
};

export const DEFAULT_CREATE_CONFIG: CreateConfig = {
  mode: "light",
  themeInput: "",
  previewScene: "dashboard",
};

export type CreateAction =
  | { type: "set-mode"; mode: PreviewMode }
  | { type: "set-theme-input"; value: string }
  | { type: "set-scene"; scene: PreviewScene }
  | { type: "reset" };

export function createReducer(state: CreateConfig, action: CreateAction): CreateConfig {
  switch (action.type) {
    case "set-mode":
      return state.mode === action.mode ? state : { ...state, mode: action.mode };
    case "set-theme-input":
      return { ...state, themeInput: action.value };
    case "set-scene":
      return state.previewScene === action.scene ? state : { ...state, previewScene: action.scene };
    case "reset":
      // Back to the Kinetix default in full, appearance included: "Reset" that left the mode behind would
      // leave the workspace in a state the defaults never describe.
      return DEFAULT_CREATE_CONFIG;
  }
}

/** True when nothing has been customized — the workspace is showing the shipped theme. */
export function isDefaultConfig(config: CreateConfig): boolean {
  return (
    config.themeInput.trim() === DEFAULT_CREATE_CONFIG.themeInput &&
    config.mode === DEFAULT_CREATE_CONFIG.mode &&
    config.previewScene === DEFAULT_CREATE_CONFIG.previewScene
  );
}

/** Re-exported so consumers of the config never reach past it into the parser's own module. */
export type { AcceptedToken };
