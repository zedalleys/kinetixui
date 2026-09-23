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
function list(items: string[]): string {
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
