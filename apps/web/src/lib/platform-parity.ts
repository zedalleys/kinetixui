/**
 * Which implementation platforms carry each component.
 *
 * The data lives in `platform-parity.json` at the repo root (not here) so
 * it's importable from plain Node scripts too (`scripts/gen-registry.mjs`,
 * which embeds it into the CLI registry) without a Next.js dependency —
 * this file is a typed wrapper over it for the web app. The data is
 * generated from `components.manifest.json` — edit that and run
 * `pnpm gen:manifest`, never this file or `platform-parity.json`.
 *
 * There is no platform list written down here. `Platform` is the key type of
 * the generated `platformDefinitions`, so adding a platform to the manifest
 * adds it to this type, and removing one turns every stale reference into a
 * type error instead of a silently wrong string.
 */
import parityData from "../../../../platform-parity.json";

export type Platform = keyof typeof parityData.platformDefinitions;
/** "web" (React, Angular) or "native" (SwiftUI, Compose, Flutter) — never a token output format. */
export type PlatformFamily = "web" | "native";

/** How a platform's package reaches a consumer, and whether it has actually been published yet. */
export type Distribution = {
  channel: string;
  coordinate: string;
  /** Declared repository truth, never a network lookup — CI must not depend on a registry being up. */
  published: boolean;
  note?: string;
};

export type PlatformDefinition = {
  family: PlatformFamily;
  label: string;
  abbr: string;
  /**
   * PACKAGE maturity — a product decision about the offering. NOT how well its implementations are
   * verified, which is {@link verificationFor}. `@kinetixui/ui` is a stable package whose catalogue is
   * verified to beta; both are true, and one word cannot say both.
   */
  maturity: string;
  /** Whether every component is expected on this platform, so a gap means a deliberate, documented decision. */
  catalogComplete: boolean;
  package: string;
  dir: string;
  distribution: Distribution;
};

export const PLATFORM_DEFINITIONS = parityData.platformDefinitions as Record<Platform, PlatformDefinition>;
export const PLATFORMS = parityData.platforms as readonly Platform[];

/** React and Angular. */
export const WEB_PLATFORMS = parityData.webPlatforms as readonly Platform[];
/** SwiftUI, Compose and Flutter. */
export const NATIVE_PLATFORMS = parityData.nativePlatforms as readonly Platform[];
/**
 * The platforms whose catalogue is complete, so "on every platform" is a meaningful claim about them. A
 * platform still rolling out is deliberately excluded — counting its gaps as exceptions would misreport both.
 */
export const CATALOG_PLATFORMS = parityData.catalogPlatforms as readonly Platform[];

/** Short two-letter tags used on the gallery cards. */
export const PLATFORM_ABBR: Record<Platform, string> = parityData.platformAbbr as Record<Platform, string>;

/** slug → the platforms it *is* on. Explicit for every component: there is no "absent means everywhere" rule. */
const COMPONENTS: Record<string, Platform[]> = parityData.components as Record<string, Platform[]>;

/** The libraries that carry `slug`, in {@link PLATFORMS} order. */
export function platformsFor(slug: string): Platform[] {
  const on = new Set(COMPONENTS[slug] ?? []);
  return PLATFORMS.filter((p) => on.has(p));
}

/** Whether `slug` ships on `platform`. */
export function isOnPlatform(slug: string, platform: Platform): boolean {
  return platformsFor(slug).includes(platform);
}

/** How many of `slugs` ship on `platform`. */
export function countOnPlatform(slugs: readonly string[], platform: Platform): number {
  return slugs.reduce((n, s) => n + (isOnPlatform(s, platform) ? 1 : 0), 0);
}

/** Platforms of one family, in {@link PLATFORMS} order — used wherever web and native are presented apart. */
export function platformsInFamily(family: PlatformFamily): Platform[] {
  return PLATFORMS.filter((p) => PLATFORM_DEFINITIONS[p].family === family);
}

/* ── verification: how much evidence stands behind each implementation ────── */

/**
 * The three things this file keeps apart, because they were once one word:
 *
 *   lifecycle      is the component's API settled?   → `component-status.json`
 *   package        is the offering a product?        → {@link PlatformDefinition.maturity}
 *   verification   what has been proved about THIS implementation, on THIS platform, by a test → below
 *
 * Verification is computed from `verification.json`, which is derived from the test files themselves. None
 * of the three is derived from the others, and the UI must never print one where a reader would take it for
 * another.
 */
export type VerificationLevel = "experimental" | "preview" | "beta" | "stable";
export type EvidenceKind = "build" | "interaction" | "accessibility" | "rtl" | "largeText" | "visual" | "published";

/** The ladder, and what each rung costs — read from the generator so the docs cannot describe a different one. */
export const VERIFICATION_LADDER = parityData.verificationLadder as readonly VerificationLevel[];
export const VERIFICATION_REQUIRES = parityData.verificationRequires as Record<VerificationLevel, EvidenceKind[]>;

const VERIFICATION = parityData.verification as Record<string, Partial<Record<Platform, VerificationLevel>>>;
const EVIDENCE = parityData.verificationEvidence as Record<string, Partial<Record<Platform, EvidenceKind[]>>>;

/** Every evidence kind, in the order the ladder and the UI present them. */
export const EVIDENCE_KINDS: readonly EvidenceKind[] = [
  "build",
  "interaction",
  "accessibility",
  "rtl",
  "largeText",
  "visual",
  "published",
];

/** How much evidence stands behind `slug` on `platform`, or null where there is no implementation. */
export function verificationFor(slug: string, platform: Platform): VerificationLevel | null {
  return VERIFICATION[slug]?.[platform] ?? null;
}

/** Which evidence kinds hold for `slug` on `platform`. The source behind each lives in verification.json. */
export function evidenceFor(slug: string, platform: Platform): EvidenceKind[] {
  return EVIDENCE[slug]?.[platform] ?? [];
}

/**
 * The weakest verification level in a platform's declared catalogue — the floor, never an average.
 *
 * A well-tested Button cannot compensate for an unverified Dialog: a reader applies the platform's word to
 * whichever component they are about to use, so the honest summary is the worst one.
 */
export const CATALOGUE_VERIFICATION = parityData.catalogueVerification as Record<Platform, VerificationLevel | null>;

/** How many components hold each evidence kind, per platform. Shown as "21 / 98", never as a tick. */
export const EVIDENCE_COUNTS = parityData.evidenceCounts as Record<Platform, Record<EvidenceKind, number>>;

/**
 * The kinds a test passage may claim. `build` and `published` are not among them: the manifest declares those.
 * Generated (`claimableEvidence`), so this split cannot drift from the generator's own.
 */
const CLAIMABLE_EVIDENCE = new Set(parityData.claimableEvidence as string[]);

/**
 * What a platform's count for one evidence kind means, read off the contract that produced it. These states
 * describe EVIDENCE MATURITY: how much a test has recorded. None of them is a statement about whether the
 * platform can do the thing — a SwiftUI control with no accessibility test still uses SwiftUI's own semantics.
 *
 *   verified            every catalogue entry on the platform has evidence of this kind: a marked test passage
 *                       (or, for `build`, the platform's CI compiling it). That is all "Verified" means. It is not
 *                       conformance to a standard, not a certification, not a promise that nothing is broken, and
 *                       not permanent: the next run of `gen:verification` recomputes it from the tests as they are.
 *   partial             a substantial share does. The fraction is the claim, and a meter draws it.
 *   limited             a test records the kind for a handful of entries (below {@link LIMITED_EVIDENCE_SHARE}).
 *                       Evidence exists and is named, but a near-empty meter would read as a failing score, so the
 *                       state is said in words and the count is secondary.
 *   not-yet-verified    none do, and the kind is one a test claims. `gen:verification` records only positive
 *                       evidence and deliberately has no N/A, so this zero says no test records the kind yet. It
 *                       is not a failed check, and it must not be drawn as an empty score.
 *
 * `published` is not evidence at all but a declared distribution fact (`platformDefinitions[p].distribution`,
 * which `gen:verification` copies), so it gets factual states rather than maturity words:
 *
 *   registry-published  the package is on its registry ("On npm").
 *   source-only         it is not. The implementation still exists and builds in CI; a consumer builds it from a
 *                       repository checkout. "Not published" alone would read as "not available", so the label
 *                       says what a reader CAN do and the sentence says what has not happened.
 *
 * There is no "not applicable": the generator has no N/A escape (see its header), so nothing could truthfully
 * produce one. Nor is there a "failed" state: the generator never records a failing check, so nothing here may
 * be styled as an error.
 */
export type EvidenceState = "verified" | "partial" | "limited" | "not-yet-verified" | "registry-published" | "source-only";

/**
 * The one presentation threshold: a claimable kind held by fewer than this share of a platform's entries reads
 * as "Limited evidence" instead of a fraction over a meter. It changes wording only; every count, every
 * verification rung and every gate is computed without it.
 *
 * The repository has no finer classification to borrow (evidence is one bit per component, and the ladder in
 * `verificationRequires` is per component, not per catalogue), so this is the single place the UI draws the
 * line. One in ten is not on a boundary of today's data: the largest count below it is 7 of 90 (7.8%) and the
 * smallest above it 22 of 98 (22.4%), so a small change to either does not flip a card.
 */
export const LIMITED_EVIDENCE_SHARE = 0.1;

export interface EvidenceStatus {
  state: EvidenceState;
  count: number;
  of: number;
  /** The state in words ("Limited evidence"): what a reader sees first, before any number. */
  label: string;
  /** Whether a meter helps: only where the fraction is substantial. Never for a zero or a handful. */
  meter: boolean;
  /**
   * The reading in a sentence, with the platform in it: the note under a row that has no fraction worth reading,
   * and what assistive technology hears after the state. The row's own label names the kind, so the short
   * sentences ("No SwiftUI test records this yet.") lean on it.
   */
  summary: string;
}

/** The evidence states in words. The distribution states take their label from the platform's channel. */
const STATE_LABEL: Record<Exclude<EvidenceState, "registry-published">, string> = {
  verified: "Verified",
  partial: "Partial",
  limited: "Limited evidence",
  "not-yet-verified": "Not yet verified",
  // the repository's own wording for this route ("Source checkout · not on a registry", "build it from a
  // repository checkout pinned to a commit"), so the cards say what the platform pages already say
  "source-only": "Source checkout only",
};

/** Evidence kinds as a sentence names them ("have right-to-left evidence"). */
const EVIDENCE_NOUN: Record<EvidenceKind | "reducedMotion", string> = {
  build: "build",
  interaction: "interaction",
  accessibility: "accessibility",
  rtl: "right-to-left",
  largeText: "large-text",
  reducedMotion: "reduced-motion",
  visual: "visual-regression",
  published: "published",
};

/** The state, and the sentence, behind `platform`'s count for `kind`, out of the platform's own entries. */
export function evidenceStatus(platform: Platform, kind: EvidenceKind | "reducedMotion"): EvidenceStatus {
  const count = (EVIDENCE_COUNTS[platform] as Record<string, number>)[kind] ?? 0;
  const of = (parityData.coverage as Record<Platform, number>)[platform];
  return classifyEvidence(PLATFORM_DEFINITIONS[platform], kind, count, of);
}

/**
 * The rule itself, given a count rather than reading one, so tests can hold every state to it (a 1 of N, a 7 of
 * N, an unpublished package) whatever today's generated counts happen to be.
 */
export function classifyEvidence(
  def: Pick<PlatformDefinition, "label" | "distribution">,
  kind: EvidenceKind | "reducedMotion",
  count: number,
  of: number,
): EvidenceStatus {
  const noun = EVIDENCE_NOUN[kind];
  const status = (state: EvidenceState, summary: string): EvidenceStatus => ({
    state,
    count,
    of,
    label: state === "registry-published" ? `On ${def.distribution.channel}` : STATE_LABEL[state],
    meter: state === "verified" || state === "partial",
    summary,
  });
  // "catalogue entries", not "components": the total includes a documented recipe (CLAIMS.md B2)
  const entries = (n: number) => `${n} ${def.label} ${n === 1 ? "entry" : "entries"}`;
  if (count > of) throw new Error(`platform-parity: ${def.label} claims ${kind} evidence for ${count} of ${of} entries`);
  if (kind === "published") {
    // a declared fact, read from the platform's distribution, never a maturity word and never a meter
    if (count === 0) {
      return status("source-only", `${def.label} is not published to ${def.distribution.channel} yet; build it from a repository checkout.`);
    }
    return status("registry-published", `${count} of ${of} ${def.label} catalogue entries are published to ${def.distribution.channel}.`);
  }
  if (count === 0) {
    // `build` is derived from the manifest's own declaration, so a declared platform at 0 is a generator fault.
    if (!CLAIMABLE_EVIDENCE.has(kind)) throw new Error(`platform-parity: ${def.label} has 0 ${kind} evidence, which the manifest cannot produce`);
    return status("not-yet-verified", `No ${def.label} test records this yet.`);
  }
  if (count === of) return status("verified", `All ${of} ${def.label} catalogue entries have ${noun} evidence.`);
  if (CLAIMABLE_EVIDENCE.has(kind) && count < of * LIMITED_EVIDENCE_SHARE) {
    return status("limited", `Tests record it for ${entries(count)} so far.`);
  }
  return status("partial", `${count} of ${of} ${def.label} catalogue entries have ${noun} evidence.`);
}

/** How many components sit on each verification rung, per platform. */
export const VERIFICATION_COUNTS = parityData.verificationCounts as Record<Platform, Partial<Record<VerificationLevel, number>>>;
