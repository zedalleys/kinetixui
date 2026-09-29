/**
 * Platform lists written into prose, derived from the manifest instead of typed.
 *
 * Marketing copy kept drifting from the product: six separate sentences across the homepage, the site
 * description, the README and the docs landing still read "React, SwiftUI, Jetpack Compose and Flutter" long
 * after Angular became a real platform, while the ticker on that same homepage already rendered five. A
 * hand-typed list is a claim with no source behind it, and it fails silently in both directions — overstating
 * a platform that was removed, understating one that was added.
 *
 * Maturity is carried through rather than flattened. Angular is real, and it is preview: a sentence that says
 * only one of those is wrong.
 */
import { PLATFORMS, PLATFORM_DEFINITIONS, type Platform } from "./platform-parity";

const label = (p: Platform) => PLATFORM_DEFINITIONS[p].label;

/** "a, b and c" — an Oxford-comma-free list, which is what the rest of the site's prose uses. */
export function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const stable = PLATFORMS.filter((p) => PLATFORM_DEFINITIONS[p].maturity === "stable");
const preview = PLATFORMS.filter((p) => PLATFORM_DEFINITIONS[p].maturity !== "stable");

/**
 * Every implementation platform, with non-stable ones named as such:
 * "React, SwiftUI, Jetpack Compose and Flutter, with Angular in preview".
 *
 * Use this anywhere prose names the platforms. Never write the list out by hand — `platform-prose.test.ts`
 * fails the build if a hand-typed list reappears in the copy this replaces.
 */
export const platformSentence: string = preview.length
  ? `${list(stable.map(label))}, with ${list(preview.map(label))} in ${PLATFORM_DEFINITIONS[preview[0]!].maturity}`
  : list(stable.map(label));

/** Just the stable ones — for sentences that are specifically about what is finished. */
export const stablePlatformSentence: string = list(stable.map(label));

/* ------------------------------------------------------------------ availability, which is not maturity */

/**
 * Maturity and distribution are different axes, and this is the pair of sentences that keeps them apart.
 *
 * The failure this exists for: `maturity` is a judgement about the implementation, and every native
 * platform is `"stable"` on that axis — the SwiftUI, Compose and Flutter ports are real, complete to 90 of
 * 98 components, and compiled by their own CI on every change. None of them is distributed. So a sentence
 * derived from maturity alone, which {@link platformSentence} is, names five platforms a reader reasonably
 * hears as five things they can install, and three of them cannot be installed at all.
 *
 * `distribution.published` is the only field that answers "can someone get this", so any sentence a reader
 * will act on has to carry it. Both lists below are derived; neither is written out.
 *
 * These deliberately do NOT soften the native work. "Not distributed" is a fact about a package registry,
 * not about the implementation, and the wording says so.
 */
const publishedPlatforms = PLATFORMS.filter((p) => PLATFORM_DEFINITIONS[p].distribution.published);
const unpublishedPlatforms = PLATFORMS.filter((p) => !PLATFORM_DEFINITIONS[p].distribution.published);

/** Platforms whose implementation can be installed from a package manager today. */
export const INSTALLABLE_PLATFORMS: readonly Platform[] = publishedPlatforms;
/** Platforms with real, CI-compiled source that is not distributed as a package. */
export const SOURCE_ONLY_PLATFORMS: readonly Platform[] = unpublishedPlatforms;

/** A platform's name, with its maturity attached when that is not "stable": "Angular (preview)". */
const withMaturity = (p: Platform): string => {
  const d = PLATFORM_DEFINITIONS[p];
  return d.maturity === "stable" ? d.label : `${d.label} (${d.maturity})`;
};

/**
 * "React and Angular (preview)" — what a reader can install right now, maturity carried so a Preview
 * package is never quietly presented as a finished one.
 */
export const installableSentence: string = list(publishedPlatforms.map(withMaturity));

/** "SwiftUI, Jetpack Compose and Flutter" — implemented, compiled in CI, not on a package registry. */
export const sourceOnlySentence: string = list(unpublishedPlatforms.map((p) => PLATFORM_DEFINITIONS[p].label));

/**
 * The sentence for any surface a reader acts on: what to install, and what exists as source.
 *
 * Collapses to just the installable half if every platform is published, so the day the native ports ship
 * this stops mentioning a distinction that no longer exists rather than having to be found and edited.
 */
export const availabilitySentence: string = unpublishedPlatforms.length
  ? `${installableSentence} install from a package registry today. ${sourceOnlySentence} are real implementations, compiled in CI, not yet distributed as packages.`
  : `${installableSentence} install from a package registry today.`;

/**
 * The same distinction as a short clause, for places where a full stop would break the sentence —
 * "…for React, SwiftUI, Jetpack Compose and Flutter, with Angular in preview (React and Angular
 * (preview) on npm; the native ports are source you compile)".
 */
export const availabilityClause: string = unpublishedPlatforms.length
  ? `${installableSentence} on a package registry; ${sourceOnlySentence} as source you compile`
  : `all on a package registry`;
