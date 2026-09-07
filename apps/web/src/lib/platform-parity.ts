/**
 * Which native libraries carry each component.
 *
 * React (`@kinetixui/ui`) ships all {@link componentDocs} entries, and the
 * four-platform rule (`/docs/contributing`) means every *new* component lands on
 * SwiftUI, Jetpack Compose and Flutter too — so this only records the handful of
 * standing exceptions. Everything not listed is on all four.
 *
 * Re-derive the exception list by diffing the component slugs against the native
 * package sources (basenames map 1:1 to slugs):
 *   packages/ui-compose/ui/src/main/kotlin/com/kinetixui/ui/*.kt  → PascalCase
 *   packages/ui-swiftui/Sources/KinetixUI/*.swift                 → PascalCase
 *   packages/ui-flutter/lib/src/*.dart                            → snake_case
 * (`sonner` resolves to Sonner / Toaster / toaster.)
 */

export const PLATFORMS = ["React", "SwiftUI", "Compose", "Flutter"] as const;
export type Platform = (typeof PLATFORMS)[number];

/** The native ports — every component has React, so it's not a useful filter. */
export const NATIVE_PLATFORMS = ["SwiftUI", "Compose", "Flutter"] as const satisfies readonly Platform[];

/** Short two-letter tags used on the gallery cards. */
export const PLATFORM_ABBR: Record<Platform, string> = {
  React: "RE",
  SwiftUI: "SW",
  Compose: "JC",
  Flutter: "FL",
};

/** slug → the platforms it *is* on. Absent slug ⇒ all four. */
const EXCEPTIONS: Record<string, Platform[]> = {
  chart: ["React", "SwiftUI", "Flutter"], // no Recharts equivalent wired for Compose yet
  combobox: ["React"], // standing non-port
  form: ["React"], // standing non-port
  "navigation-menu": ["React"], // standing non-port
  inform: ["React", "Compose"],
  sidebar: ["React", "SwiftUI", "Compose"],
};

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
