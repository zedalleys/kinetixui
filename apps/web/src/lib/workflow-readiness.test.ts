import { describe, expect, it } from "vitest";
import verification from "../../../../verification.json";
import manifest from "../../../../components.manifest.json";
import blocksManifest from "../../../../blocks.manifest.json";
import { WORKFLOWS, workflowParts, type Workflow } from "./business-discovery";
import { PLATFORMS, type Platform } from "./platform-parity";
import {
  blockEvidenceNote,
  componentEvidence,
  blockLevel,
  componentLevel,
  EVIDENCE_LEVELS,
  readinessFor,
  weakest,
  workflowReadiness,
  type BlockPlatformEvidence,
  type EvidenceLevel,
} from "./workflow-readiness";
import { levelFrom, skipIn } from "../../../../scripts/evidence-levels.mjs";

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
 * The tier rule, restated here rather than imported, so the generator and this file must agree: a CI build, then
 * interaction AND accessibility both recorded for headless, and both OBSERVED (chromium) for runtime.
 */
function tier(build: boolean, interaction: string[], accessibility: string[]): EvidenceLevel {
  if (!build) return "source";
  if (!interaction.length || !accessibility.length) return "build";
  return interaction.includes("chromium") && accessibility.includes("chromium") ? "runtime" : "headless";
}
function expectedBlock(e: BlockPlatformEvidence | undefined): EvidenceLevel {
  if (!e?.source?.length) return "not-implemented";
  const envs = (k: "interaction" | "accessibility") => (e[k] ?? []).map((r) => r.environment ?? "");
  return tier(!!e.build?.length, envs("interaction"), envs("accessibility"));
}
const block = (over: Partial<BlockPlatformEvidence>): BlockPlatformEvidence => ({
  level: "build",
  source: [{ ref: "x.tsx" }],
  build: [{ ref: "ci" }],
  ...over,
});

/** Where each evidence file runs, read from the raw `sources` list. */
const ENV: Record<string, string> = Object.fromEntries(
  Object.values(verification.sources as Record<string, { file: string; environment: string }[]>).flat().map((x) => [x.file, x.environment]),
);
/** The rule, restated against the RAW component records: the same tier, from the refs and where their files run. */
function expectedComponent(slug: string, p: Platform): EvidenceLevel {
  if (!DECLARED[slug]?.platforms.includes(p)) return "not-implemented";
  const e = RAW[slug]?.[p] ?? {};
  const envs = (k: string) => (e[k] ?? []).map((ref) => ENV[ref.replace(/:\d+-\d+$/, "")] ?? "");
  return tier((e.build?.length ?? 0) > 0, envs("interaction"), envs("accessibility"));
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
  // the generator's own rule (scripts/evidence-levels.mjs), held directly
  type Evidence = { source?: boolean; build?: boolean; interaction?: string[]; accessibility?: string[] };
  const L = (o: Evidence) => levelFrom({ implemented: true, build: true, ...o });

  it("never calls source-only evidence build, headless or runtime", () => {
    expect(L({ build: false })).toBe("source");
    expect(L({ build: false, interaction: ["chromium"], accessibility: ["chromium"] })).toBe("source"); // tests without a recorded build
    expect(L({ source: false, interaction: ["chromium"], accessibility: ["chromium"] })).toBe("source");
  });

  it("never calls a build alone Headless verified", () => {
    expect(L({})).toBe("build");
    expect(L({ interaction: ["jsdom"] })).toBe("build");
    expect(L({ accessibility: ["chromium"] })).toBe("build");
  });

  it("needs interaction AND accessibility for headless, and both OBSERVED for runtime", () => {
    expect(L({ interaction: ["jsdom"], accessibility: ["jsdom"] })).toBe("headless");
    expect(L({ interaction: ["robolectric"], accessibility: ["robolectric"] })).toBe("headless");
    expect(L({ interaction: ["flutter_test"], accessibility: ["flutter_test"] })).toBe("headless");
    expect(L({ interaction: ["xctest"], accessibility: ["xctest"] })).toBe("headless");
    // one observed kind is not runtime: the other ran headless
    expect(L({ interaction: ["jsdom"], accessibility: ["chromium", "jsdom"] })).toBe("headless");
    expect(L({ interaction: ["chromium"], accessibility: ["jsdom"] })).toBe("headless");
    expect(L({ interaction: ["chromium", "jsdom"], accessibility: ["chromium"] })).toBe("runtime");
    // an unknown environment is not a runtime one
    expect(L({ interaction: ["simulator?"], accessibility: ["simulator?"] })).toBe("headless");
  });

  it("does not let evidence stand in for a missing implementation", () => {
    expect(levelFrom({ implemented: false, build: true, interaction: ["chromium"], accessibility: ["chromium"] })).toBe("not-implemented");
  });

  it("orders headless between build and runtime, so a headless part lowers a runtime floor", () => {
    expect(EVIDENCE_LEVELS.indexOf("headless")).toBe(EVIDENCE_LEVELS.indexOf("build") + 1);
    expect(EVIDENCE_LEVELS.indexOf("runtime")).toBe(EVIDENCE_LEVELS.indexOf("headless") + 1);
    expect(weakest(["runtime", "headless", "runtime"])).toBe("headless");
    expect(weakest(["headless", "build"])).toBe("build");
  });

  it("reads a skipped test in any of the five test languages, and not a data value named skip", () => {
    expect(skipIn("a.test.tsx", "it.skip('x', () => {})")).toBe("it.skip");
    expect(skipIn("a.spec.ts", "xit('x', () => {})")).toBe("xit(");
    expect(skipIn("a.spec.ts", "describe.skipIf(ci)('x', () => {})")).toBe("describe.skipIf");
    expect(skipIn("A.swift", "throw XCTSkip(\"later\")")).toBe("XCTSkip");
    expect(skipIn("A.kt", "@Ignore\n@Test fun x() {}")).toBe("@Ignore");
    expect(skipIn("a_test.dart", "testWidgets('x', (t) async {}, skip: true);")).toBe("skip: true");
    expect(skipIn("overlays.mjs", "return { skip: true };")).toBeNull();
    expect(skipIn("a.test.tsx", "it('skips nothing', () => {})")).toBeNull();
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
    // receipt on Angular is compiled in CI but has no observed runtime; number-input there is runtime verified
    const r = readinessFor(w, "Angular", { components: ["number-input"], blocks: ["receipt"], iot: 0 });
    expect(r.weakestBlock).toBe(expectedBlock(RAW_BLOCKS.receipt!.platforms.Angular));
    expect(r.weakestComponent).toBe("runtime");
    expect(r.weakestBlock).toBe("build");
    expect(r.weakestImplemented).toBe(weakest([r.weakestBlock!, r.weakestComponent!])); // the overall floor counts both
  });

  it("never lets headless evidence make a block runtime verified", () => {
    const headless = block({ interaction: [{ ref: "a.spec.ts:1-9", environment: "jsdom" }], accessibility: [{ ref: "b_test.dart:1-9", environment: "flutter_test" }] });
    expect(expectedBlock(headless)).toBe("headless");
    expect(blockEvidenceNote(headless)).toBe("Interaction and accessibility tested headless");
    // one observed kind is not enough: runtime needs BOTH seen in a browser or on a device
    const half = block({ interaction: [{ ref: "r.mjs:1-9", environment: "chromium" }], accessibility: [{ ref: "c.kt:1-9", environment: "robolectric" }] });
    expect(expectedBlock(half)).toBe("headless");
    expect(blockEvidenceNote(half)).toBe("Interaction observed in a browser; accessibility tested headless");
    expect(expectedBlock(block({}))).toBe("build");
    expect(blockEvidenceNote(block({}))).toBe("No interaction or accessibility test");
    expect(expectedBlock(block({ build: [] }))).toBe("source");
    expect(expectedBlock({ level: "build" })).toBe("not-implemented"); // no source of its own, whatever it says
  });

  it("never lets a headless part ride up to a runtime floor, so the new rung cannot raise readiness", () => {
    const w = synthetic([{ title: "A", rows: [], status: "existing" }]);
    // on Angular, number-input was observed in a browser and badge only headless
    expect(componentLevel("number-input", "Angular")).toBe("runtime");
    expect(componentLevel("badge", "Angular")).toBe("headless");
    const r = readinessFor(w, "Angular", { components: ["number-input", "badge"], blocks: [], iot: 0 });
    expect(r.weakestComponent).toBe("headless");
    expect(r.weakestRequired).toBe("headless");
    // and a block at build holds the overall floor at build, whatever its components reached
    const withBlock = readinessFor(w, "Angular", { components: ["number-input"], blocks: ["receipt"], iot: 0 });
    expect(withBlock.weakestRequired).toBe("build");
    // every real floor is the minimum of its parts, read independently of the implementation
    for (const wf of WORKFLOWS)
      for (const x of workflowReadiness(wf)) {
        if (!x.parts.length) continue; // a workflow with no parts yet has nothing to be ready
        const lowest = x.parts.map((p) => EVIDENCE_LEVELS.indexOf(p.level)).reduce((a, b) => Math.min(a, b), EVIDENCE_LEVELS.length - 1);
        expect(x.weakestRequired, `${wf.id} ${x.platform}`).toBe(EVIDENCE_LEVELS[lowest]);
      }
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
  it("every component level on every platform matches the raw verification records", () => {
    for (const slug of Object.keys(DECLARED))
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

describe("component evidence notes", () => {
  it("say where a component's tests ran, and match its tier", () => {
    // React button: interaction in jsdom (Vitest), accessibility also in Chromium (a11y-browser)
    const e = componentEvidence("button", "React");
    expect(e.level).toBe(componentLevel("button", "React"));
    expect(e.interaction!.every((r) => r.environment === "jsdom")).toBe(true);
    expect(e.accessibility!.some((r) => r.environment === "chromium")).toBe(true);
    expect(blockEvidenceNote(e)).toBe("Accessibility observed in a browser; interaction tested headless");
    expect(e.level).toBe("headless");
    // a native component's tests are headless, and the note says so; no native component is runtime verified
    const flutter = Object.keys(verification.components).find((s) => componentLevel(s, "Flutter") === "headless")!;
    expect(blockEvidenceNote(componentEvidence(flutter, "Flutter"))).toBe("Interaction and accessibility tested headless");
    for (const p of ["SwiftUI", "Compose", "Flutter"] as const)
      for (const slug of Object.keys(verification.componentLevels)) expect(componentLevel(slug, p), `${slug} ${p}`).not.toBe("runtime");
  });
});
