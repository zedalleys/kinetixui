import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PlatformBadges } from "./platform-badges";
import { PLATFORMS, platformsFor } from "@/lib/platform-parity";
import { GUIDANCE_LABEL, platformStateFor } from "@/lib/platform-tabs";
import parity from "../../../../platform-parity.json";

/**
 * The coverage row has to say the same thing the component's own platform tabs say.
 *
 * `check:manifest` already regenerates platform-parity.json from the manifest and `check:platform-source`
 * already walks every claim against the packages, so a coverage *number* cannot drift. What neither can see
 * is a surface that reads correct data and then flattens it — which is what this row did, striking through
 * every platform a component was not on and calling all of them "not yet". That is a promise, and for the
 * 26 cells that are a composition or a native equivalent it is a promise nobody intends to keep.
 *
 * These derive from the canonical data rather than restating it, so adding a component or a platform needs
 * no edit here.
 */

const components = parity.components as Record<string, string[]>;
const guidance = parity.guidance as Record<string, Record<string, { type: string; reason?: string; wave?: string }>>;

afterEach(cleanup);

const labelFor = (slug: string) => {
  cleanup();
  render(<PlatformBadges slug={slug} />);
  return screen.getByRole("img").getAttribute("aria-label") ?? "";
};

describe("every absent platform has a stated reason", () => {
  /**
   * The invariant that makes an honest row possible at all: no cell may be merely absent. If this fails,
   * some component/platform pair would render as unexplained, and the row would have nothing true to say.
   */
  it("leaves no component/platform cell absent without guidance", () => {
    const unexplained: string[] = [];
    for (const slug of Object.keys(components)) {
      for (const platform of PLATFORMS) {
        if (components[slug].includes(platform)) continue;
        if (!guidance[slug]?.[platform]) unexplained.push(`${slug}/${platform}`);
      }
    }
    expect(unexplained, `absent with no guidance: ${unexplained.join(", ")}`).toEqual([]);
  });
});

describe("the row agrees with the component's own platform tabs", () => {
  it("names every carried platform and gives every absent one its reason", () => {
    // One slug per guidance type, chosen from the data rather than hardcoded, so this keeps testing the
    // real shapes even if a particular component changes.
    const sample = new Map<string, [string, string]>();
    for (const [slug, byPlatform] of Object.entries(guidance)) {
      for (const [platform, g] of Object.entries(byPlatform)) {
        if (!sample.has(g.type)) sample.set(g.type, [slug, platform]);
      }
    }
    expect(sample.size).toBeGreaterThanOrEqual(3);

    for (const [type, [slug, platform]] of sample) {
      const label = labelFor(slug);
      expect(label, `${slug}: the row does not mention ${platform}`).toContain(platform);
      expect(
        label.toLowerCase(),
        `${slug}/${platform} is "${type}" but the row does not say so`,
      ).toContain(GUIDANCE_LABEL[type as keyof typeof GUIDANCE_LABEL].toLowerCase());
    }
  });

  /**
   * The specific regression: a finished decision described as pending work. Only `planned` may read as
   * something still to come.
   */
  it("never describes a composition or a native equivalent as pending", () => {
    const PENDING = /not implemented yet|not yet|coming|planned|soon/i;
    for (const [slug, byPlatform] of Object.entries(guidance)) {
      const deliberate = Object.entries(byPlatform).filter(
        ([, g]) => g.type === "composition" || g.type === "native-equivalent",
      );
      if (deliberate.length === 0) continue;
      // Only check slugs whose absences are ALL deliberate; a mixed row legitimately mentions both.
      const absent = PLATFORMS.filter((p) => !components[slug].includes(p));
      if (absent.length !== deliberate.length) continue;
      const label = labelFor(slug);
      expect(PENDING.test(label), `${slug}: "${label}" calls a deliberate non-port pending`).toBe(false);
    }
  });

  it("states what the component is carried on, for every catalogue entry", () => {
    for (const slug of Object.keys(components)) {
      const label = labelFor(slug);
      expect(label.length, `${slug} has an empty coverage label`).toBeGreaterThan(0);
      for (const platform of platformsFor(slug)) {
        const named = label.includes(platform) || /catalogue-complete/.test(label);
        expect(named, `${slug}: carried on ${platform} but the row does not say so`).toBe(true);
      }
    }
  });
});

describe("the row and the tabs cannot diverge", () => {
  it("reads its state from platformStateFor, the same source the detail tabs use", () => {
    for (const slug of Object.keys(components).slice(0, 12)) {
      for (const platform of PLATFORMS) {
        const state = platformStateFor(slug, platform);
        const carried = platformsFor(slug).includes(platform);
        expect(
          state === "implementation",
          `${slug}/${platform}: coverage says ${carried}, the tab source says ${String(state)}`,
        ).toBe(carried);
      }
    }
  });
});
