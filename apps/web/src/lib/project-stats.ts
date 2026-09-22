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
import { PLATFORMS } from "./platform-parity";
import { componentTotal, gaps } from "./platform-support";
import { siteConfig } from "./site";

/** The four component IMPLEMENTATION platforms — React, SwiftUI, Compose, Flutter. Not a web/token output. */
export const componentPlatformCount = PLATFORMS.length;

/**
 * How many of the manifest's components ship on all four implementation platforms. `gaps` (platform-support.ts)
 * lists every component missing at least one platform, so this is the total minus that list's length.
 */
export const fullFourPlatformCount = componentTotal - gaps.length;

/** Components with a documented exception — missing at least one implementation platform, with a reason why. */
export const documentedExceptionCount = gaps.length;

/** `0.22.1` — the version the three lockstep npm packages currently publish. */
export const projectVersion = siteConfig.version;

/** `MIT` — read from the package, not typed by hand (a release/legal maturity label is a separate fact, not this). */
export const projectLicense = siteConfig.license;
