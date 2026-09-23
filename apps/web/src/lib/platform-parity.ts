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

/** How a platform's package reaches a consumer, and whether it has actually been published yet. */
export type Distribution = {
  channel: string;
  coordinate: string;
  /** Declared repository truth, never a network lookup — CI must not depend on a registry being up. */
  published: boolean;
  note?: string;
};

export type PlatformDefinition = {
  family: PlatformFamily;
  label: string;
  abbr: string;
  /**
   * PACKAGE maturity — a product decision about the offering. NOT how well its implementations are
   * verified, which is {@link verificationFor}. `@kinetixui/ui` is a stable package whose catalogue is
   * verified to beta; both are true, and one word cannot say both.
   */
  maturity: string;
  /** Whether every component is expected on this platform, so a gap means a deliberate, documented decision. */
  catalogComplete: boolean;
  package: string;
  dir: string;
  distribution: Distribution;
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

/* ── verification: how much evidence stands behind each implementation ────── */

/**
 * The three things this file keeps apart, because they were once one word:
 *
 *   lifecycle      is the component's API settled?   → `component-status.json`
 *   package        is the offering a product?        → {@link PlatformDefinition.maturity}
 *   verification   what has been proved about THIS implementation, on THIS platform, by a test → below
 *
 * Verification is computed from `verification.json`, which is derived from the test files themselves. None
 * of the three is derived from the others, and the UI must never print one where a reader would take it for
 * another.
 */
export type VerificationLevel = "experimental" | "preview" | "beta" | "stable";
export type EvidenceKind = "build" | "interaction" | "accessibility" | "rtl" | "largeText" | "visual" | "published";

/** The ladder, and what each rung costs — read from the generator so the docs cannot describe a different one. */
export const VERIFICATION_LADDER = parityData.verificationLadder as readonly VerificationLevel[];
export const VERIFICATION_REQUIRES = parityData.verificationRequires as Record<VerificationLevel, EvidenceKind[]>;

const VERIFICATION = parityData.verification as Record<string, Partial<Record<Platform, VerificationLevel>>>;
const EVIDENCE = parityData.verificationEvidence as Record<string, Partial<Record<Platform, EvidenceKind[]>>>;

/** Every evidence kind, in the order the ladder and the UI present them. */
export const EVIDENCE_KINDS: readonly EvidenceKind[] = [
  "build",
  "interaction",
  "accessibility",
  "rtl",
  "largeText",
  "visual",
  "published",
];

/** How much evidence stands behind `slug` on `platform`, or null where there is no implementation. */
export function verificationFor(slug: string, platform: Platform): VerificationLevel | null {
  return VERIFICATION[slug]?.[platform] ?? null;
}

/** Which evidence kinds hold for `slug` on `platform`. The source behind each lives in verification.json. */
export function evidenceFor(slug: string, platform: Platform): EvidenceKind[] {
  return EVIDENCE[slug]?.[platform] ?? [];
}

/**
 * The weakest verification level in a platform's declared catalogue — the floor, never an average.
 *
 * A well-tested Button cannot compensate for an unverified Dialog: a reader applies the platform's word to
 * whichever component they are about to use, so the honest summary is the worst one.
 */
export const CATALOGUE_VERIFICATION = parityData.catalogueVerification as Record<Platform, VerificationLevel | null>;

/** How many components hold each evidence kind, per platform. Shown as "21 / 98", never as a tick. */
export const EVIDENCE_COUNTS = parityData.evidenceCounts as Record<Platform, Record<EvidenceKind, number>>;

/** How many components sit on each verification rung, per platform. */
export const VERIFICATION_COUNTS = parityData.verificationCounts as Record<Platform, Partial<Record<VerificationLevel, number>>>;
