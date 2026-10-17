import { describe, expect, it } from "vitest";
import verification from "../../../../verification.json";
import manifest from "../../../../components.manifest.json";
import blocksManifest from "../../../../blocks.manifest.json";
import { WORKFLOWS, workflowParts, type Workflow } from "./business-discovery";
import { PLATFORMS, type Platform } from "./platform-parity";
import { blockLevel, componentLevel, levelFor, readinessFor, weakest, workflowReadiness, type EvidenceLevel } from "./workflow-readiness";

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

  it("keeps the component floor apart from the block floor, so an unverified block does not hide component evidence", () => {
    const w = synthetic([{ title: "A", rows: [], status: "existing" }]);
    const r = readinessFor(w, "React", { components: ["result-state"], blocks: ["receipt"], iot: 0 });
    expect(r.weakestBlock).toBe("source");
    expect(r.weakestComponent).toBe(expectedComponent("result-state", "React"));
    expect(r.weakestImplemented).toBe("source"); // the overall floor still counts the block
  });

  it("caps a block at source present: no record verifies blocks", () => {
    for (const slug of Object.keys(BLOCK_SOURCES))
      for (const p of PLATFORMS) expect(["source", "not-implemented"]).toContain(blockLevel(slug, p));
  });
});

describe("evidence levels: the real data", () => {
  it("every component level on every workflow matches the raw verification records", () => {
    for (const w of WORKFLOWS)
      for (const slug of workflowParts(w).components)
        for (const p of PLATFORMS) expect(componentLevel(slug, p), `${slug} on ${p}`).toBe(expectedComponent(slug, p));
  });

  it("every block level matches the block manifest's sources", () => {
    for (const w of WORKFLOWS)
      for (const slug of workflowParts(w).blocks)
        for (const p of PLATFORMS) expect(blockLevel(slug, p)).toBe(BLOCK_SOURCES[slug]?.sources[p] ? "source" : "not-implemented");
  });

  it("calls a workflow complete on a platform only when every stage ships and every part exists there", () => {
    for (const w of WORKFLOWS)
      for (const r of workflowReadiness(w)) {
        const allStages = w.stages.every((s) => s.status === "existing");
        expect(r.complete, `${w.id} on ${r.platform}`).toBe(allStages && r.total > 0 && r.parts.every((x) => x.level !== "not-implemented"));
      }
  });
});
