/**
 * Platform readiness for a workflow on a /use-cases page: which platforms implement what the workflow uses, and how
 * much evidence stands behind each implementation.
 *
 * Four things that this file keeps apart, because a reader evaluating a platform needs each one separately:
 *
 *   catalogue availability   does an entry ship at all?                  → the roadmap row's status (discovery-index)
 *   stage coverage           how many of the workflow's stages ship?     → `Workflow.coverage`
 *   implementation coverage  how many of its parts exist on a platform?  → components.manifest.json, blocks.manifest.json
 *   verification             what has a test proved about each part?     → verification.json (via platform-parity.json)
 *
 * Nothing here is typed by hand: every level is computed from the evidence records, and the aggregate is the WEAKEST
 * part, never an average. A workflow on a platform where one part is missing is incomplete, however well the other
 * parts are tested.
 */
import blocksManifest from "../../../../blocks.manifest.json";
import { PLATFORMS, evidenceFor, platformsFor, type EvidenceKind, type Platform } from "./platform-parity";
import { workflowParts, type Workflow } from "./business-discovery";

/**
 * The evidence ladder, weakest first. Conservative by construction:
 *
 *   not-implemented   no implementation on this platform.
 *   not-verified      an implementation is declared, but no evidence record exists for it.
 *   source            the source exists; nothing records that it builds (every block today: blocks have no record).
 *   build             a build record (gen:verification records one for every declared platform, as CI compiles
 *                     that package); no test records BOTH interaction and accessibility for this part.
 *   runtime           a test records interaction AND accessibility for this specific part on this platform.
 *
 * A package build is not runtime evidence, and source inspection is never build evidence.
 */
export const EVIDENCE_LEVELS = ["not-implemented", "not-verified", "source", "build", "runtime"] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export const EVIDENCE_LEVEL_LABEL: Record<EvidenceLevel, string> = {
  "not-implemented": "Not implemented",
  "not-verified": "Not verified",
  source: "Source present",
  build: "Build verified",
  runtime: "Runtime verified",
};

/** What each level means, in a sentence a reader can act on. */
export const EVIDENCE_LEVEL_MEANING: Record<EvidenceLevel, string> = {
  "not-implemented": "There is no implementation on this platform.",
  "not-verified": "An implementation is declared, but no test or build records evidence for it.",
  source: "The source exists; no build or test records evidence for it.",
  build: "CI compiles the package it ships in; interaction and accessibility are not both tested.",
  runtime: "Tests record both interaction and accessibility for it.",
};

/** The kinds a part must hold, all of them, for a level. `build` is the manifest's own declaration, read through CI. */
export const LEVEL_REQUIRES: Record<"build" | "runtime", readonly EvidenceKind[]> = {
  build: ["build"],
  runtime: ["build", "interaction", "accessibility"],
};

const rank = (l: EvidenceLevel) => EVIDENCE_LEVELS.indexOf(l);
export const weakest = (levels: EvidenceLevel[]): EvidenceLevel =>
  levels.reduce((a, b) => (rank(b) < rank(a) ? b : a), "runtime" as EvidenceLevel);

/**
 * The level a part's evidence earns. Pure, so tests can hold every rung to the rule with made-up evidence.
 * `implemented` false is always `not-implemented`, whatever evidence is passed: evidence for a part that does not
 * exist is a data fault, not a reason to claim it.
 */
export function levelFor(implemented: boolean, evidence: readonly EvidenceKind[] | null, hasSource = true): EvidenceLevel {
  if (!implemented) return "not-implemented";
  if (evidence === null) return hasSource ? "source" : "not-verified";
  const held = new Set(evidence);
  if (LEVEL_REQUIRES.runtime.every((k) => held.has(k))) return "runtime";
  if (LEVEL_REQUIRES.build.every((k) => held.has(k))) return "build";
  return hasSource ? "source" : "not-verified";
}

type BlockEntry = { sources: Partial<Record<Platform, string>> };
const BLOCKS = blocksManifest.blocks as Record<string, BlockEntry>;

/** A catalogue component on a platform: the manifest says whether it exists, verification.json what it proved. */
export function componentLevel(slug: string, platform: Platform): EvidenceLevel {
  return levelFor(platformsFor(slug).includes(platform), evidenceFor(slug, platform), true);
}

/**
 * A block on a platform. blocks.manifest.json names a source file per platform, and no evidence record covers blocks,
 * so the most a block can be is `source`. Said as such rather than borrowed from the components it composes.
 */
export function blockLevel(slug: string, platform: Platform): EvidenceLevel {
  const source = BLOCKS[slug]?.sources?.[platform];
  return levelFor(Boolean(source), null, Boolean(source));
}

export type Part = { kind: "component" | "block"; slug: string; level: EvidenceLevel };

export type PlatformReadiness = {
  platform: Platform;
  parts: Part[];
  implemented: number;
  total: number;
  /** The weakest level among the parts that exist here; null when none does. */
  weakestImplemented: EvidenceLevel | null;
  /**
   * The floor split by kind, over EVERY part of that kind, so a missing component makes the component floor
   * `not-implemented`: a platform with two of ten parts never outranks one with all ten. Null only when the workflow
   * uses no part of that kind. Blocks have no verification record, so they would hide what the components' tests
   * prove; the table shows both rather than letting one stand for the other.
   */
  weakestComponent: EvidenceLevel | null;
  weakestBlock: EvidenceLevel | null;
  /** The weakest level over EVERY part, so a missing part makes it `not-implemented`. */
  weakestRequired: EvidenceLevel;
  /**
   * Whether the whole workflow can be built on this platform today: every stage ships in full AND every part exists
   * here. A workflow with a partial or planned stage is never complete, on any platform.
   */
  complete: boolean;
};

const floorOf = (parts: Part[]) => (parts.length ? weakest(parts.map((p) => p.level)) : null);

/** Readiness of `w` on `platform`, over the components and blocks its shipping stages use. */
export function readinessFor(w: Workflow, platform: Platform, parts = workflowParts(w)): PlatformReadiness {
  const list: Part[] = [
    ...parts.components.map((slug): Part => ({ kind: "component", slug, level: componentLevel(slug, platform) })),
    ...parts.blocks.map((slug): Part => ({ kind: "block", slug, level: blockLevel(slug, platform) })),
  ];
  const present = list.filter((p) => p.level !== "not-implemented");
  const stagesComplete = w.coverage.existing === w.stages.length;
  return {
    platform,
    parts: list,
    implemented: present.length,
    total: list.length,
    weakestImplemented: present.length ? weakest(present.map((p) => p.level)) : null,
    weakestComponent: floorOf(list.filter((p) => p.kind === "component")),
    weakestBlock: floorOf(list.filter((p) => p.kind === "block")),
    weakestRequired: list.length ? weakest(list.map((p) => p.level)) : "not-implemented",
    complete: stagesComplete && list.length > 0 && present.length === list.length,
  };
}

/** Every platform, in the canonical order. */
export function workflowReadiness(w: Workflow): PlatformReadiness[] {
  const parts = workflowParts(w);
  return PLATFORMS.map((p) => readinessFor(w, p, parts));
}

/** "3 of 9 parts implemented" — never "supported", which would read as the whole workflow. */
export function implementedLine(r: Pick<PlatformReadiness, "implemented" | "total">): string {
  if (r.total === 0) return "Nothing to implement yet";
  return `${r.implemented} of ${r.total} ${r.total === 1 ? "part" : "parts"} implemented`;
}
