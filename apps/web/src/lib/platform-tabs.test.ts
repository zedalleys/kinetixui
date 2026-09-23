// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "../../../../components.manifest.json";
import { PLATFORMS, PLATFORM_DEFINITIONS, platformsFor, type Platform } from "./platform-parity";
import { GUIDANCE_LABEL, PLATFORM_TABS, TAB_OF, platformStateFor } from "./platform-tabs";
import { usageExamples } from "../registry/usage-examples.generated";
import { platformCode } from "../registry/platform-code";

/**
 * The rules that make a five-platform Code panel honest rather than merely full.
 *
 * Two failures are being prevented here, and they pull in opposite directions. One is a tab that is empty or
 * missing, which tells a reader nothing about a platform that has plenty to say. The other — the one this
 * repository has actually shipped before — is a tab that shows real, useful code for a component KinetixUI
 * does not implement there, which reads as a claim of support.
 *
 * So: every platform must have something to show, and anything that is not an implementation must be marked
 * as what it is. Both directions are asserted from the manifest, never from a list typed in here.
 */

type Guidance = { type: string; reason?: string; wave?: string };
type Component = { platforms: string[]; platformGuidance?: Record<string, Guidance> };
const components = manifest.components as Record<string, Component>;
const slugs = Object.keys(components);

describe("the tab set", () => {
  it("has exactly one tab per declared platform, in manifest order", () => {
    expect(PLATFORM_TABS.map((t) => t.platform)).toEqual([...PLATFORMS]);
    expect(new Set(PLATFORM_TABS.map((t) => t.tab)).size).toBe(PLATFORM_TABS.length);
  });

  it("takes every label from platformDefinitions rather than naming platforms again", () => {
    for (const t of PLATFORM_TABS) expect(t.label).toBe(PLATFORM_DEFINITIONS[t.platform].label);
  });

  it("marks a platform that is not stable on the tab itself", () => {
    const preview = PLATFORM_TABS.filter((t) => t.maturity !== "stable");
    // Angular is the preview platform today; the assertion is about the mechanism, not about Angular
    expect(preview.every((t) => PLATFORM_DEFINITIONS[t.platform].maturity !== "stable")).toBe(true);
  });

  it("spells no platform label in its code — a hand-typed one is how they drift", () => {
    // comments stripped: prose may name a platform, the code may not. The tab-key map is allowed to carry
    // the manifest's platform KEYS (Angular, SwiftUI, Compose); what must not appear is a display label.
    const code = readFileSync("src/lib/platform-tabs.ts", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    for (const label of ["iOS", "Android", "Jetpack Compose"]) expect(code).not.toContain(label);
  });
});

describe("every component has something truthful for every platform", () => {
  it.each(slugs)("%s", (slug) => {
    for (const platform of PLATFORMS) {
      const state = platformStateFor(slug, platform);
      expect(state, `${slug} has neither an implementation nor guidance for ${platform}`).not.toBeNull();
    }
  });

  it("never marks a platform as both implemented and guided", () => {
    for (const slug of slugs) {
      for (const platform of Object.keys(components[slug]!.platformGuidance ?? {})) {
        expect(components[slug]!.platforms).not.toContain(platform);
      }
    }
  });
});

describe("guidance is not parity", () => {
  it("is left out of the per-platform coverage the site reports", () => {
    for (const slug of slugs) {
      const counted = platformsFor(slug);
      for (const platform of Object.keys(components[slug]!.platformGuidance ?? {})) {
        expect(counted).not.toContain(platform as Platform);
      }
    }
  });

  it("gives each kind a label that says it is not a port", () => {
    expect(GUIDANCE_LABEL["native-equivalent"]).toMatch(/equivalent/i);
    expect(GUIDANCE_LABEL.composition).toMatch(/composition/i);
    expect(GUIDANCE_LABEL.planned).toMatch(/not implemented/i);
  });

  it("has a reason wherever it shows code, and a wave wherever it does not", () => {
    for (const slug of slugs) {
      for (const [platform, g] of Object.entries(components[slug]!.platformGuidance ?? {})) {
        if (g.type === "planned") expect(g.wave, `${slug}/${platform}`).toBeTruthy();
        else expect(g.reason?.length ?? 0, `${slug}/${platform}`).toBeGreaterThan(40);
      }
    }
  });
});

describe("the snippets behind the tabs", () => {
  const tabFor = (platform: Platform) => TAB_OF[platform];

  it("exists for every guidance entry that promises one", () => {
    for (const slug of slugs) {
      for (const [platform, g] of Object.entries(components[slug]!.platformGuidance ?? {})) {
        if (g.type === "planned") continue;
        const tab = tabFor(platform as Platform);
        const key = `${slug}-demo`;
        const has = Boolean(usageExamples[key]?.[tab as never]) || Boolean(platformCode[key]?.[tab as never]);
        expect(has, `${slug}: ${platform} guidance with no ${key} snippet`).toBe(true);
      }
    }
  });

  it("does NOT exist for a planned gap — an invented example is worse than an empty tab", () => {
    for (const slug of slugs) {
      for (const [platform, g] of Object.entries(components[slug]!.platformGuidance ?? {})) {
        if (g.type !== "planned") continue;
        const tab = tabFor(platform as Platform);
        expect(usageExamples[`${slug}-demo`]?.[tab as never], `${slug}/${platform}`).toBeUndefined();
        expect(platformCode[`${slug}-demo`]?.[tab as never], `${slug}/${platform}`).toBeUndefined();
      }
    }
  });

  it("covers every Angular implementation, which has no hand-written tier to fall back on", () => {
    for (const slug of slugs.filter((s) => components[s]!.platforms.includes("Angular"))) {
      expect(usageExamples[`${slug}-demo`]?.angular, `${slug} is on Angular with no compiled example`).toBeTruthy();
    }
  });

  it("carries no hand-written Angular snippet at all", () => {
    for (const entry of Object.values(platformCode)) expect(entry).not.toHaveProperty("angular");
  });
});
