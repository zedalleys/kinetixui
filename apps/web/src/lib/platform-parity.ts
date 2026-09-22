/**
 * Which implementation platforms carry each component.
 *
 * The data lives in `platform-parity.json` at the repo root (not here) so
 * it's importable from plain Node scripts too (`scripts/gen-registry.mjs`,
 * which embeds it into the CLI registry) without a Next.js dependency —
 * this file is a typed wrapper over it for the web app. The data is
 * generated from `components.manifest.json` — edit that and run
 * `pnpm gen:manifest`, never this file or `platform-parity.json`.
 *
 * There is no platform list written down here. `Platform` is the key type of
 * the generated `platformDefinitions`, so adding a platform to the manifest
 * adds it to this type, and removing one turns every stale reference into a
 * type error instead of a silently wrong string.
 */
import parityData from "../../../../platform-parity.json";

export type Platform = keyof typeof parityData.platformDefinitions;
/** "web" (React, Angular) or "native" (SwiftUI, Compose, Flutter) — never a token output format. */
export type PlatformFamily = "web" | "native";

export type PlatformDefinition = {
  family: PlatformFamily;
  label: string;
  abbr: string;
  maturity: string;
  /** Whether every component is expected on this platform, so a gap means a deliberate, documented decision. */
  catalogComplete: boolean;
  package: string;
  dir: string;
};

export const PLATFORM_DEFINITIONS = parityData.platformDefinitions as Record<Platform, PlatformDefinition>;
export const PLATFORMS = parityData.platforms as readonly Platform[];

/** React and Angular. */
export const WEB_PLATFORMS = parityData.webPlatforms as readonly Platform[];
/** SwiftUI, Compose and Flutter. */
export const NATIVE_PLATFORMS = parityData.nativePlatforms as readonly Platform[];
/**
 * The platforms whose catalogue is complete, so "on every platform" is a meaningful claim about them. A
 * platform still rolling out is deliberately excluded — counting its gaps as exceptions would misreport both.
 */
export const CATALOG_PLATFORMS = parityData.catalogPlatforms as readonly Platform[];

/** Short two-letter tags used on the gallery cards. */
export const PLATFORM_ABBR: Record<Platform, string> = parityData.platformAbbr as Record<Platform, string>;

/** slug → the platforms it *is* on. Explicit for every component: there is no "absent means everywhere" rule. */
const COMPONENTS: Record<string, Platform[]> = parityData.components as Record<string, Platform[]>;

/** The libraries that carry `slug`, in {@link PLATFORMS} order. */
export function platformsFor(slug: string): Platform[] {
  const on = new Set(COMPONENTS[slug] ?? []);
  return PLATFORMS.filter((p) => on.has(p));
}

/** Whether `slug` ships on `platform`. */
export function isOnPlatform(slug: string, platform: Platform): boolean {
  return platformsFor(slug).includes(platform);
}

/** How many of `slugs` ship on `platform`. */
export function countOnPlatform(slugs: readonly string[], platform: Platform): number {
  return slugs.reduce((n, s) => n + (isOnPlatform(s, platform) ? 1 : 0), 0);
}

/** Platforms of one family, in {@link PLATFORMS} order — used wherever web and native are presented apart. */
export function platformsInFamily(family: PlatformFamily): Platform[] {
  return PLATFORMS.filter((p) => PLATFORM_DEFINITIONS[p].family === family);
}
