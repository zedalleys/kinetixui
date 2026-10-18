/**
 * Platform readiness for a workflow on a /use-cases page: which platforms implement what the workflow uses, and how
 * much evidence stands behind each implementation.
 *
 * Four things that this file keeps apart, because a reader evaluating a platform needs each one separately:
 *
 *   catalogue availability   does an entry ship at all?                  → the roadmap row's status (discovery-index)
 *   stage coverage           how many of the workflow's stages ship?     → `Workflow.coverage`
 *   implementation coverage  how many of its parts exist on a platform?  → components.manifest.json, blocks.manifest.json
 *   verification             what has a test proved about each part?     → verification.json (componentLevels, blocks)
 *
 * Nothing here is typed by hand: every level is decided by gen:verification from the evidence, and the aggregate is the WEAKEST
 * part, never an average. A workflow on a platform where one part is missing is incomplete, however well the other
 * parts are tested.
 */
import verification from "../../../../verification.json";
import { PLATFORMS, type EvidenceKind, type Platform } from "./platform-parity";
import { workflowParts, type Workflow } from "./business-discovery";

/**
 * The evidence ladder, weakest first (verification.json schema version 2). Every level is decided by
 * gen:verification, for components and blocks alike, with one rule (scripts/evidence-levels.mjs); this file only
 * reads it.
 *
 *   not-implemented   no implementation on this platform.
 *   not-verified      an implementation is declared, but no evidence record exists for it.
 *   source            the source exists; nothing records that it builds.
 *   build             a required CI step compiles it; interaction and accessibility are not both tested.
 *   headless          compiled, and tests CI executes assert both interaction and accessibility, at least one of
 *                     them only headless (jsdom, Robolectric, flutter_test, XCTest).
 *   runtime           compiled, and both interaction and accessibility were OBSERVED: in a real browser for web, on
 *                     a simulator, emulator or device for native.
 *
 * A package build is not runtime evidence, source inspection is never build evidence, and a headless run is never
 * runtime evidence. A workflow is as verified as its weakest part, so adding a rung can never raise a floor that a
 * weaker part holds down.
 */
export const EVIDENCE_LEVELS = ["not-implemented", "not-verified", "source", "build", "headless", "runtime"] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export const EVIDENCE_LEVEL_LABEL: Record<EvidenceLevel, string> = {
  "not-implemented": "Not implemented",
  "not-verified": "Not verified",
  source: "Source present",
  build: "Build verified",
  headless: "Headless verified",
  runtime: "Runtime verified",
};

/** What each level means, in a sentence a reader can act on. */
export const EVIDENCE_LEVEL_MEANING: Record<EvidenceLevel, string> = {
  "not-implemented": "There is no implementation on this platform.",
  "not-verified": "An implementation is declared, but no test or build records evidence for it.",
  source: "The source exists; no CI build records it. Any tests it has are listed but do not raise its level.",
  build: "A CI step compiles it; interaction and accessibility are not both tested.",
  headless:
    "Tests CI runs assert both interaction and accessibility, but at least one ran only headless (jsdom, Robolectric, flutter_test or XCTest), not in a browser or on a device. The note under it says which.",
  runtime: "Both interaction and accessibility were observed running: in a real browser for web, on a simulator, emulator or device for native.",
};

const rank = (l: EvidenceLevel) => EVIDENCE_LEVELS.indexOf(l);
export const weakest = (levels: EvidenceLevel[]): EvidenceLevel =>
  levels.reduce((a, b) => (rank(b) < rank(a) ? b : a), "runtime" as EvidenceLevel);

/** One evidence reference, as gen:verification writes it: where, and (for a test) the environment it ran in. */
export type BlockEvidenceRef = { ref: string; environment?: string };
export type BlockPlatformEvidence = {
  level: EvidenceLevel;
  source?: BlockEvidenceRef[];
  build?: BlockEvidenceRef[];
  interaction?: BlockEvidenceRef[];
  accessibility?: BlockEvidenceRef[];
  limitations?: string[];
};
type BlockRecord = { title: string; platforms: Record<Platform, BlockPlatformEvidence> };
const BLOCK_EVIDENCE = verification.blocks as unknown as Record<string, BlockRecord>;
/** The environments that count as observing a block run. Read from the generated file, never restated. */
export const RUNTIME_ENVIRONMENTS: readonly string[] = verification.runtimeEnvironments;

type ComponentLevelRecord = { level: EvidenceLevel; interaction?: string[]; accessibility?: string[] };
const COMPONENT_LEVELS = verification.componentLevels as unknown as Record<string, Partial<Record<Platform, ComponentLevelRecord>>>;

/** Components per level on each platform, as gen:verification counted them. */
export const componentLevelTotals = verification.componentLevelTotals as Record<Platform, Partial<Record<EvidenceLevel, number>>>;

/**
 * A catalogue component on a platform, as gen:verification decided it. A slug or platform with no record is not
 * implemented: nothing here can promote a part the generator did not.
 */
export function componentLevel(slug: string, platform: Platform): EvidenceLevel {
  return COMPONENT_LEVELS[slug]?.[platform]?.level ?? "not-implemented";
}

type ComponentRecord = Partial<Record<Platform, Partial<Record<EvidenceKind, string[]>>>>;
const COMPONENT_REFS = verification.components as unknown as Record<string, ComponentRecord>;
/** Where each component evidence file runs (jsdom, chromium, xctest…), as gen:verification recorded it. */
const SOURCE_ENVIRONMENT: Record<string, string> = Object.fromEntries(
  Object.values(verification.sources as Record<string, { file: string; environment?: string }[]>)
    .flat()
    .map((s) => [s.file, s.environment ?? ""]),
);

/**
 * A component's interaction and accessibility references on a platform, each tagged with where its suite runs, in
 * the same shape as a block's record so the same note can describe both.
 */
export function componentEvidence(slug: string, platform: Platform): BlockPlatformEvidence {
  const refs = COMPONENT_REFS[slug]?.[platform] ?? {};
  const tagged = (kind: "interaction" | "accessibility") =>
    (refs[kind] ?? []).map((ref) => ({ ref, environment: SOURCE_ENVIRONMENT[ref.replace(/:\d+-\d+$/, "")] }));
  return { level: componentLevel(slug, platform), interaction: tagged("interaction"), accessibility: tagged("accessibility") };
}

/**
 * A block on a platform, as gen:verification recorded it (verification.json `blocks`): its own source file, the
 * CI step that compiles it, and the tests that drove it, each with where it ran. Never borrowed from the
 * components it composes. A block with no record is not implemented.
 */
export function blockEvidence(slug: string, platform: Platform): BlockPlatformEvidence {
  return BLOCK_EVIDENCE[slug]?.platforms[platform] ?? { level: "not-implemented" };
}

export function blockLevel(slug: string, platform: Platform): EvidenceLevel {
  return blockEvidence(slug, platform).level;
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
   * uses no part of that kind. Kept apart because a block and the components inside it are verified separately; the
   * table shows both rather than letting one stand for the other.
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

/**
 * What stands behind a block's interaction and accessibility, in words: observed (a browser or a device), headless
 * (jsdom, Robolectric, flutter_test), or nothing. Said beside the level, so a Build verified block with headless
 * tests reads differently from one with none, and neither reads as more than it is.
 */
export function blockEvidenceNote(e: BlockPlatformEvidence): string | null {
  if (e.level === "not-implemented") return null;
  const observed: string[] = [];
  const headless: string[] = [];
  for (const kind of ["interaction", "accessibility"] as const) {
    const list = e[kind] ?? [];
    if (list.some((r) => RUNTIME_ENVIRONMENTS.includes(r.environment ?? ""))) observed.push(kind);
    else if (list.length) headless.push(kind);
  }
  const out: string[] = [];
  if (observed.length) out.push(`${observed.join(" and ")} observed in a browser`);
  if (headless.length) out.push(`${headless.join(" and ")} tested headless`);
  if (!observed.length && !headless.length) return "No interaction or accessibility test";
  const line = out.join("; ");
  return line[0]!.toUpperCase() + line.slice(1);
}
