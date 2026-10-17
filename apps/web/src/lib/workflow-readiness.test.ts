import { describe, expect, it } from "vitest";
import verification from "../../../../verification.json";
import manifest from "../../../../components.manifest.json";
import blocksManifest from "../../../../blocks.manifest.json";
import { WORKFLOWS, workflowParts, type Workflow } from "./business-discovery";
import { PLATFORMS, type Platform } from "./platform-parity";
import {
  blockEvidenceNote,
  blockLevel,
  componentLevel,
  levelFor,
  readinessFor,
  weakest,
  workflowReadiness,
  type BlockPlatformEvidence,
  type EvidenceLevel,
} from "./workflow-readiness";

/**
 * The evidence model behind the /use-cases readiness tables. Two kinds of test:
 *
 *   negative controls  made-up evidence that must NOT earn a level (source-only or build-only as runtime, a missing
 *                      part hidden by an average, a partial workflow called complete).
 *   the real data      every level on every page recomputed from the RAW records (verification.json and the two
 *                      manifests), not from platform-parity.json, which the implementation reads. Disagreement means
 *                      the derivation, not the data, changed.
 */

type Raw = Record<string, Partial<Record<Platform, Record<string, string[]>>>>;
const RAW = verification.components as unknown as Raw;
const DECLARED = manifest.components as unknown as Record<string, { platforms: string[] }>;
const BLOCK_SOURCES = blocksManifest.blocks as unknown as Record<string, { sources: Partial<Record<Platform, string>> }>;
const RAW_BLOCKS = verification.blocks as unknown as Record<string, { platforms: Record<Platform, BlockPlatformEvidence> }>;

/**
 * The block rule, restated against the raw refs: its own source, a CI build, and interaction AND accessibility
 * both OBSERVED (an environment in runtimeEnvironments). A headless ref never counts toward runtime.
 */
function expectedBlock(e: BlockPlatformEvidence | undefined): EvidenceLevel {
  if (!e?.source?.length) return "not-implemented";
  if (!e.build?.length) return "source";
  const seen = (k: "interaction" | "accessibility") => (e[k] ?? []).some((r) => r.environment === "chromium");
  return seen("interaction") && seen("accessibility") ? "runtime" : "build";
}
const block = (over: Partial<BlockPlatformEvidence>): BlockPlatformEvidence => ({
  level: "build",
  source: [{ ref: "x.tsx" }],
  build: [{ ref: "ci" }],
  ...over,
});

/** The rule, restated against the raw records: runtime needs a recorded build, interaction AND accessibility source. */
function expectedComponent(slug: string, p: Platform): EvidenceLevel {
  if (!DECLARED[slug]?.platforms.includes(p)) return "not-implemented";
  const e = RAW[slug]?.[p] ?? {};
  const has = (k: string) => (e[k]?.length ?? 0) > 0;
  if (has("build") && has("interaction") && has("accessibility")) return "runtime";
  if (has("build")) return "build";
  return "source";
}

const synthetic = (stages: Workflow["stages"]): Workflow => ({
  id: "synthetic",
  title: "Synthetic",
  domain: "commerce",
  summary: "",
  stages,
  coverage: {
    existing: stages.filter((s) => s.status === "existing").length,
    partial: stages.filter((s) => s.status === "partial").length,
    planned: stages.filter((s) => s.status === "planned").length,
  },
});

describe("evidence levels: negative controls", () => {
  it("never calls source-only evidence runtime or build", () => {
    expect(levelFor(true, null)).toBe("source");
    expect(levelFor(true, [])).toBe("source");
    expect(levelFor(true, null, false)).toBe("not-verified");
  });

  it("never calls build-only evidence runtime", () => {
    expect(levelFor(true, ["build"])).toBe("build");
    expect(levelFor(true, ["build", "published"])).toBe("build");
  });

  it("needs interaction AND accessibility, on top of a build, for runtime", () => {
    expect(levelFor(true, ["build", "accessibility"])).toBe("build");
    expect(levelFor(true, ["build", "interaction"])).toBe("build");
    expect(levelFor(true, ["build", "accessibility", "rtl", "largeText"])).toBe("build");
    expect(levelFor(true, ["interaction", "accessibility"])).toBe("source"); // tests without a recorded build
    expect(levelFor(true, ["build", "interaction", "accessibility"])).toBe("runtime");
  });

  it("does not let evidence stand in for a missing implementation", () => {
    expect(levelFor(false, ["build", "interaction", "accessibility"])).toBe("not-implemented");
  });

  it("aggregates by the weakest part, never an average", () => {
    expect(weakest(["runtime", "runtime", "runtime", "runtime", "source"])).toBe("source");
    expect(weakest(["runtime", "not-implemented"])).toBe("not-implemented");
  });

  it("does not call a workflow complete with a missing part, or with a stage that has not shipped", () => {
    const allShip = synthetic([{ title: "A", rows: [], status: "existing" }]);
    // price-breakdown is React-only in the manifest; a platform without it is incomplete however good the rest is
    const parts = { components: ["number-input", "price-breakdown"], blocks: [], iot: 0 };
    const angular = readinessFor(allShip, "Angular", parts);
    expect(angular.complete).toBe(false);
    expect(angular.weakestRequired).toBe("not-implemented");
    expect(angular.implemented).toBe(1);
    expect(readinessFor(allShip, "React", parts).complete).toBe(true);

    const partial = synthetic([
      { title: "A", rows: [], status: "existing" },
      { title: "B", rows: [], status: "partial" },
    ]);
    expect(readinessFor(partial, "React", parts).complete).toBe(false);
  });

  it("keeps the component floor apart from the block floor, so a weaker block does not hide component evidence", () => {
    const w = synthetic([{ title: "A", rows: [], status: "existing" }]);
    // receipt on Angular has headless tests only, so it is build; number-input there is runtime verified
    const r = readinessFor(w, "Angular", { components: ["number-input"], blocks: ["receipt"], iot: 0 });
    expect(r.weakestBlock).toBe(expectedBlock(RAW_BLOCKS.receipt!.platforms.Angular));
    expect(r.weakestComponent).toBe("runtime");
    expect(r.weakestBlock).toBe("build");
    expect(r.weakestImplemented).toBe(weakest([r.weakestBlock!, r.weakestComponent!])); // the overall floor counts both
  });

  it("never lets headless evidence make a block runtime verified", () => {
    const headless = block({ interaction: [{ ref: "a.spec.ts:1-9", environment: "jsdom" }], accessibility: [{ ref: "b_test.dart:1-9", environment: "flutter_test" }] });
    expect(expectedBlock(headless)).toBe("build");
    expect(blockEvidenceNote(headless)).toBe("Interaction and accessibility tested headless");
    // one observed kind is not enough: runtime needs BOTH seen in a browser or on a device
    const half = block({ interaction: [{ ref: "r.mjs:1-9", environment: "chromium" }], accessibility: [{ ref: "c.kt:1-9", environment: "robolectric" }] });
    expect(expectedBlock(half)).toBe("build");
    expect(blockEvidenceNote(half)).toBe("Interaction observed in a browser; accessibility tested headless");
    expect(expectedBlock(block({}))).toBe("build");
    expect(blockEvidenceNote(block({}))).toBe("No interaction or accessibility test");
    expect(expectedBlock(block({ build: [] }))).toBe("source");
    expect(expectedBlock({ level: "build" })).toBe("not-implemented"); // no source of its own, whatever it says
  });

  it("does not let a block borrow its components' evidence", () => {
    // order-summary composes number-input, which is runtime verified on Angular; the block itself is not
    expect(componentLevel("number-input", "Angular")).toBe("runtime");
    expect(blockLevel("order-summary", "Angular")).toBe(expectedBlock(RAW_BLOCKS["order-summary"]!.platforms.Angular));
    expect(blockLevel("order-summary", "Angular")).not.toBe("runtime");
  });

  it("counts a missing part in the per-kind floor, so a platform with fewer parts never outranks one with all", () => {
    const w = synthetic([{ title: "A", rows: [], status: "existing" }]);
    // number-input is runtime verified on Angular; price-breakdown does not exist there
    const parts = { components: ["number-input", "price-breakdown"], blocks: [], iot: 0 };
    expect(readinessFor(w, "Angular", parts).weakestComponent).toBe("not-implemented");
    for (const wf of WORKFLOWS)
      for (const r of workflowReadiness(wf))
        if (r.implemented < r.total) expect(r.weakestRequired, `${wf.id} ${r.platform}`).toBe("not-implemented");
  });

  it("does not let the floor skip a required block that is missing on a platform", () => {
    const w = synthetic([{ title: "A", rows: [], status: "existing" }]);
    // every real block exists on every platform today, so the missing one is made up: it has no source anywhere
    const parts = { components: ["number-input"], blocks: ["receipt", "not-a-block"], iot: 0 };
    for (const p of PLATFORMS) {
      const r = readinessFor(w, p, parts);
      expect(r.weakestBlock, p).toBe("not-implemented");
      expect(r.weakestRequired, p).toBe("not-implemented");
      expect(r.implemented, p).toBe(2);
    }
  });

  it("does not call a workflow complete when one of its blocks is unsupported on that platform", () => {
    const w = synthetic([{ title: "A", rows: [], status: "existing" }]);
    const withBlock = { components: [], blocks: ["receipt"], iot: 0 };
    const missing = { components: [], blocks: ["receipt", "not-a-block"], iot: 0 };
    for (const p of PLATFORMS) {
      expect(readinessFor(w, p, withBlock).complete, p).toBe(true);
      expect(readinessFor(w, p, missing).complete, p).toBe(false);
    }
  });

  it("counts a block as implemented only where the manifest names its own file", () => {
    for (const slug of Object.keys(BLOCK_SOURCES))
      for (const p of PLATFORMS) expect(blockLevel(slug, p) === "not-implemented", `${slug} on ${p}`).toBe(!BLOCK_SOURCES[slug]!.sources[p]);
  });
});

describe("evidence levels: the real data", () => {
  it("every component level on every workflow matches the raw verification records", () => {
    for (const w of WORKFLOWS)
      for (const slug of workflowParts(w).components)
        for (const p of PLATFORMS) expect(componentLevel(slug, p), `${slug} on ${p}`).toBe(expectedComponent(slug, p));
  });

  it("every block level matches the rule applied to its raw evidence refs, and no generated level is inflated", () => {
    for (const slug of Object.keys(RAW_BLOCKS))
      for (const p of PLATFORMS) {
        const raw = RAW_BLOCKS[slug]!.platforms[p];
        expect(raw.level, `${slug} on ${p}: generated level`).toBe(expectedBlock(raw));
        expect(blockLevel(slug, p), `${slug} on ${p}`).toBe(expectedBlock(raw));
      }
  });

  it("has no block evidence for a block the manifest no longer lists, and none missing for one it does", () => {
    expect(Object.keys(RAW_BLOCKS).sort()).toEqual(Object.keys(BLOCK_SOURCES).sort());
  });

  it("calls a workflow complete on a platform only when every stage ships and every part exists there", () => {
    for (const w of WORKFLOWS)
      for (const r of workflowReadiness(w)) {
        const allStages = w.stages.every((s) => s.status === "existing");
        expect(r.complete, `${w.id} on ${r.platform}`).toBe(allStages && r.total > 0 && r.parts.every((x) => x.level !== "not-implemented"));
      }
  });
});
