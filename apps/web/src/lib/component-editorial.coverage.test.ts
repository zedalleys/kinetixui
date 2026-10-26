import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COMPONENT_EDITORIAL } from "./component-editorial";
import { componentDocs } from "./site";
import baseline from "./component-editorial.baseline.json";

/**
 * Coverage identity, as opposed to coverage size.
 *
 * The count gate in `component-editorial.test.ts` pins the number of entries at both ends, which makes a
 * change in *size* impossible without a visible diff. It says nothing about *which* components are covered:
 * swapping ten entries for ten different ones keeps the count at 30 and passes. These tests close that hole,
 * so that the count gate can later be relaxed to a floor without losing anything.
 *
 * The contract is a committed baseline: every slug that has ever had editorial copy stays covered, unless it
 * is moved to `retired` with a reason. Adding a slug to `covered` in the same change that adds its entry is
 * the intended cost — one line, and it is what makes new coverage show up in review.
 */

const SOURCE = readFileSync(join(__dirname, "component-editorial.ts"), "utf8");
const SLUGS = new Set(componentDocs.map((i) => i.href.split("/").pop()!));
const present = Object.keys(COMPONENT_EDITORIAL);

/**
 * Keys as they are written, not as they survive. A duplicated key in an object literal silently overwrites
 * the earlier one, so the runtime object cannot show a duplicate and the source text is the only witness.
 */
const sourceKeys = [...SOURCE.matchAll(/^ {2}(?:"([a-z0-9-]+)"|([a-z0-9-]+)):\s*\{/gm)].map((m) => m[1] ?? m[2]!);

describe("editorial coverage identity", () => {
  it("keeps every component the baseline says is covered", () => {
    const missing = baseline.covered.filter((slug) => !(slug in COMPONENT_EDITORIAL) && !(slug in baseline.retired));
    expect(missing, `coverage lost without being retired: ${missing.join(", ")}`).toEqual([]);
  });

  it("never drops below the approved floor", () => {
    expect(present.length).toBeGreaterThanOrEqual(baseline.approvedFloor);
  });

  it("retires a component only with a reason, and only once it is really gone", () => {
    for (const [slug, reason] of Object.entries(baseline.retired as Record<string, string>)) {
      expect(baseline.covered, `${slug} is retired but was never covered`).toContain(slug);
      expect(slug in COMPONENT_EDITORIAL, `${slug} is retired but still has an entry`).toBe(false);
      expect(reason.trim().length, `${slug} is retired with no reason`).toBeGreaterThanOrEqual(20);
    }
  });

  it("declares every entry exactly once in the source", () => {
    const seen = new Set<string>();
    const duplicates = sourceKeys.filter((k) => (seen.has(k) ? true : (seen.add(k), false)));
    expect(duplicates, `declared more than once: ${duplicates.join(", ")}`).toEqual([]);
    expect(sourceKeys.length, "source keys and runtime keys disagree").toBe(present.length);
  });

  it("covers only components that exist, and lists every covered slug in the baseline", () => {
    for (const slug of present) {
      expect(SLUGS, `${slug} is not a component page`).toContain(slug);
      expect(baseline.covered, `${slug} has an entry but is not in the baseline`).toContain(slug);
    }
  });

  it("reports what coverage looks like now", () => {
    const added = present.filter((s) => !baseline.covered.includes(s));
    const removed = baseline.covered.filter((s) => !present.includes(s));
    const unchanged = present.filter((s) => baseline.covered.includes(s));
    // Not an assertion: the line a reviewer reads to see a batch land.
    console.info(
      `editorial coverage — ${present.length} of ${SLUGS.size} pages; ` +
        `${unchanged.length} unchanged, ${added.length} added (${added.join(", ") || "none"}), ` +
        `${removed.length} removed (${removed.join(", ") || "none"}), ` +
        `${Object.keys(baseline.retired).length} retired`,
    );
    expect(added.length + unchanged.length).toBe(present.length);
  });
});
