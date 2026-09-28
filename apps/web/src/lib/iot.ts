/**
 * What the site is allowed to say about `@kinetixui/iot`, read from the package itself.
 *
 * The version, the entry points and the React requirement are facts the published package already states, so
 * they are read from its manifest rather than restated here — the same reason `siteConfig.version` reads
 * `@kinetixui/ui` and `PACKAGES` reads each package's own name. A number typed into a page is a number that
 * goes stale on the next release without anything failing.
 *
 * `MATURITY` is the one string that is not machine-readable in the manifest: npm has no maturity field, and the
 * package declares it in prose (`description`) and in its changelog. It is a constant here, with
 * `current-truth.test.ts` asserting the package still says the same word — so the two cannot drift apart
 * silently, and the site is not the place the claim originates.
 */
import iotPackage from "../../../../packages/iot/package.json";

/** `0.1.0` — whatever the package is at. Never typed into a page. */
export const IOT_VERSION: string = iotPackage.version;

export const IOT_PACKAGE: string = iotPackage.name;

export const IOT_LICENSE: string = iotPackage.license;

/**
 * The module's maturity, as one lowercase word. Matches the nav badge vocabulary (`maturityBadge` in site.ts
 * produces the same shape for a platform), so IoT reads like the rest of the system rather than like an
 * exception with its own label.
 */
export const IOT_MATURITY = "experimental" as const;

/** `Experimental · 0.1.0` — the one place that pairing is composed. */
export const IOT_MATURITY_LABEL = `Experimental · ${IOT_VERSION}`;

/**
 * The public entry points, in the order a reader meets them, derived from the `exports` map.
 *
 * `./package.json` is deliberately excluded: it is in the exports map because tooling reads it, not because it
 * is a surface anyone imports from. Everything else the map lists is shown.
 */
export const IOT_ENTRY_POINTS: readonly { subpath: string; specifier: string }[] = Object.keys(iotPackage.exports)
  .filter((subpath) => subpath !== "./package.json")
  .sort((a, b) => (a === "." ? -1 : b === "." ? 1 : a.localeCompare(b)))
  .map((subpath) => ({
    subpath,
    specifier: subpath === "." ? iotPackage.name : `${iotPackage.name}${subpath.slice(1)}`,
  }));

/**
 * Whether React is required to use the package at all. It is not: `react` is an optional peer, which is the
 * machine-readable form of "the functions half needs no renderer". Read rather than asserted so that a future
 * change to the peer cannot leave the page claiming something the manifest contradicts.
 */
export const IOT_REACT_OPTIONAL: boolean =
  iotPackage.peerDependenciesMeta?.react?.optional === true;

/** The declared React range, e.g. `>=18`. */
export const IOT_REACT_PEER: string = iotPackage.peerDependencies.react;

/** Zero runtime dependencies is a property of the package, not a claim about it. */
export const IOT_RUNTIME_DEPENDENCY_COUNT: number = Object.keys(
  (iotPackage as { dependencies?: Record<string, string> }).dependencies ?? {},
).length;
