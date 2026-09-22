/**
 * Homepage marketing facts, derived — never hand-typed. Every value here is read from (or re-exported from a
 * module that already reads) an authoritative repository source, so a component release changes these numbers
 * automatically instead of requiring a homepage edit. See `apps/web/src/lib/project-stats.test.ts`, which proves
 * each value against its source, and `platform-claims.test.ts`, which scans for hand-typed counts returning.
 *
 * Deliberately not re-derived here: `componentTotal`, `platformCount` and `gaps` already exist in
 * `platform-support.ts` (built from `components.manifest.json`), and `PLATFORMS` already exists in
 * `platform-parity.ts` (built from the generated `platform-parity.json`). This module only combines them.
 */
import { CATALOG_PLATFORMS, PLATFORMS } from "./platform-parity";
import { componentTotal, gaps } from "./platform-support";
import { siteConfig } from "./site";

/**
 * The component IMPLEMENTATION platforms — React and Angular on the web, SwiftUI, Compose and Flutter native.
 * Never a token output: CSS, TypeScript, Swift, Kotlin and Dart token files are generated artefacts, not
 * platforms, and counting them here is the mistake this module exists to prevent.
 */
export const componentPlatformCount = PLATFORMS.length;

/**
 * How many platforms the "on every platform" claim is actually about. Angular is excluded while its catalogue
 * is still rolling out — its gaps are "not ported yet", not decisions, and folding them into the exception
 * count would misreport both numbers at once. Derived from the manifest's `catalogComplete` flag, so the day
 * Angular's catalogue is declared complete this number moves on its own.
 */
export const catalogPlatformCount = CATALOG_PLATFORMS.length;

/**
 * How many of the manifest's components ship on every complete-catalogue platform. `gaps`
 * (platform-support.ts) lists every component missing at least one of those, so this is the total minus it.
 */
export const fullCoverageCount = componentTotal - gaps.length;

/** Components with a documented exception — missing at least one complete-catalogue platform, with a reason. */
export const documentedExceptionCount = gaps.length;

/** `0.22.1` — the version the three lockstep npm packages currently publish. */
export const projectVersion = siteConfig.version;

/** `MIT` — read from the package, not typed by hand (a release/legal maturity label is a separate fact, not this). */
export const projectLicense = siteConfig.license;
