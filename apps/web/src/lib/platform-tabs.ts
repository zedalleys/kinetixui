/**
 * The platform tabs on a component's Code panel, and what each one is allowed to say.
 *
 * There is no platform list written down here. The tabs, their order, their labels and their maturity all
 * come from `platformDefinitions` in `components.manifest.json` by way of the generated `platform-parity.json`
 * — so adding a platform to the manifest adds a tab, and `satisfies Record<Platform, …>` below turns a
 * platform with no tab key or no language into a type error rather than a missing tab nobody notices.
 *
 * The other half of this file is the distinction the pages have to make. A tab can be showing one of three
 * different things, and they are not the same claim:
 *
 *   implementation     KinetixUI ships this component on that platform. This — and only this — is parity.
 *   native equivalent  the platform already has the concept, so there is nothing to port. Real, compiled
 *                      code, clearly labelled as the platform's own idiom rather than ours.
 *   composition        the concept is assembled from other KinetixUI components there.
 *   planned            no implementation yet, and it should exist. No code: a wave, and a plain statement.
 *
 * Presenting a native equivalent or a composition as though it were a KinetixUI component is the exact
 * failure this repository has been removing for several releases. The UI must be able to tell them apart,
 * which is why the state comes from data rather than from the presence or absence of a string.
 */
import parityData from "../../../../platform-parity.json";
import { PLATFORMS, PLATFORM_DEFINITIONS, type Platform } from "./platform-parity";

/** Manifest platform → the key the demo registry and the generated examples use for its snippet. */
export const TAB_OF = {
  React: "react",
  Angular: "angular",
  SwiftUI: "swift",
  Compose: "kotlin",
  Flutter: "dart",
} as const satisfies Record<Platform, string>;

export type CodeTab = (typeof TAB_OF)[Platform];

/** Syntax-highlighting language per tab. Angular examples are templates, so the language is HTML. */
const LANGUAGE = {
  react: "tsx",
  angular: "html",
  swift: "swift",
  kotlin: "kotlin",
  dart: "dart",
} as const satisfies Record<CodeTab, string>;

export type PlatformTab = {
  tab: CodeTab;
  platform: Platform;
  /** The public label, from the manifest — "Jetpack Compose", not a second copy of the name. */
  label: string;
  language: string;
  /** "stable" | "preview" — a preview platform is marked so the tab does not imply equal maturity. */
  maturity: string;
};

/** Every tab, in manifest order: React, Angular, SwiftUI, Jetpack Compose, Flutter. */
export const PLATFORM_TABS: readonly PlatformTab[] = PLATFORMS.map((platform) => ({
  tab: TAB_OF[platform],
  platform,
  label: PLATFORM_DEFINITIONS[platform].label,
  language: LANGUAGE[TAB_OF[platform]],
  maturity: PLATFORM_DEFINITIONS[platform].maturity,
}));

export type GuidanceType = "native-equivalent" | "composition" | "planned";
export type Guidance = { type: GuidanceType; reason?: string; wave?: string };

const GUIDANCE = parityData.guidance as Record<string, Partial<Record<Platform, Guidance>>>;
const COMPONENTS = parityData.components as Record<string, Platform[]>;

/**
 * What this component's `platform` tab is: a real implementation, or the guidance that stands in for one.
 * Returns null only for a slug the manifest does not know, which is a demo rendered outside a component page.
 */
export function platformStateFor(slug: string | null, platform: Platform): "implementation" | Guidance | null {
  if (!slug || !COMPONENTS[slug]) return null;
  if (COMPONENTS[slug].includes(platform)) return "implementation";
  return GUIDANCE[slug]?.[platform] ?? null;
}

/** The short label shown beside a snippet that is not a port. Never a generic fallback: an unexplained one is the thing this prevents. */
export const GUIDANCE_LABEL: Record<GuidanceType, string> = {
  "native-equivalent": "Native equivalent",
  composition: "Composition",
  planned: "Not implemented yet",
};

/** Human wording for an Angular delivery wave, for the tab of a component that has no port yet. */
export const WAVE_LABEL: Record<string, string> = {
  primitives: "primitives",
  inputs: "inputs and forms",
  layout: "layout",
  navigation: "navigation",
  overlays: "overlays",
  data: "data display",
  advanced: "advanced interaction",
};
