/**
 * Which native libraries carry each component.
 *
 * The data lives in `platform-parity.json` at the repo root (not here) so
 * it's importable from plain Node scripts too (`scripts/gen-registry.mjs`,
 * which embeds it into the CLI registry) without a Next.js dependency —
 * this file is a typed wrapper over it for the web app. Edit
 * `platform-parity.json`, not this file, to change the data itself.
 */
import parityData from "../../../../platform-parity.json";

export type Platform = "React" | "SwiftUI" | "Compose" | "Flutter";
export const PLATFORMS = parityData.platforms as readonly Platform[];

/** The native ports — every component has React, so it's not a useful filter. */
export const NATIVE_PLATFORMS = parityData.nativePlatforms as readonly Platform[];

/** Short two-letter tags used on the gallery cards. */
export const PLATFORM_ABBR: Record<Platform, string> = parityData.platformAbbr as Record<Platform, string>;

/** slug → the platforms it *is* on. Absent slug ⇒ all four. */
const EXCEPTIONS: Record<string, Platform[]> = parityData.exceptions as Record<string, Platform[]>;

/** The native libraries that carry `slug`, in {@link PLATFORMS} order. */
export function platformsFor(slug: string): Platform[] {
  const on = new Set(EXCEPTIONS[slug] ?? PLATFORMS);
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
