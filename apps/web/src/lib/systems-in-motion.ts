/**
 * The facts behind the homepage's "Systems in Motion" art direction, read out of the repository at build time.
 *
 * The homepage follows one real semantic token, `color.action`, from its DTCG source, through the files Style
 * Dictionary writes, across the token boundary into the hand-written component that consumes it on each
 * platform (`Switch`, the one control every platform implements and every platform colours with `action`).
 * Every string a visitor reads in those visuals comes from here, and every one of them is found in a file:
 *
 *   - token source rows, resolved values and generated declarations  → `token-evidence.ts` (DTCG + packages/tokens/dist)
 *   - platform names, order, maturity, distribution, coverage        → `platform-parity.json` / `components.manifest.json`
 *   - the component source shown per platform, and the line in it    → the platform package's own source file
 *     that reads the token
 *
 * A file, a declaration or a token reference this module cannot find is an error, not an empty panel: the
 * homepage is prerendered, so a rename in a generator or a component fails `next build` instead of shipping a
 * diagram that describes code which no longer exists. `systems-in-motion.test.ts` checks the same from the
 * other side, including the negative cases.
 *
 * Server-only: it reads the repository with node:fs, like `token-evidence.ts`.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { highlight, type HighlightLanguage, type Token } from "./highlight";
import {
  CATALOGUE_VERIFICATION,
  PLATFORMS,
  PLATFORM_DEFINITIONS,
  evidenceFor,
  evidenceStatus,
  verificationFor,
  type EvidenceKind,
  type EvidenceStatus,
  type Platform,
} from "./platform-parity";
import { componentTotal, platformCount } from "./platform-support";
import { GUIDANCE_LABEL, SETUP_HREF, platformStateFor } from "./platform-tabs";
import { repoRoot, tokenEvidence, type OutputBlock } from "./token-evidence";

/** The token the homepage follows. One constant, so the hero, the pipeline and the tests cannot disagree. */
export const STORY_TOKEN = "action";
/** The component the homepage follows the token into. Implemented on every platform in the manifest. */
export const STORY_COMPONENT = "switch";

/* ------------------------------------------------------------------ token outputs */

/** Which generated output a platform's implementation reads. React and Angular share the one web stylesheet. */
const OUTPUT_OF = {
  React: "Web",
  Angular: "Web",
  SwiftUI: "iOS",
  Compose: "Android",
  Flutter: "Flutter",
} as const satisfies Record<Platform, OutputBlock["platform"]>;

export interface TokenOutput {
  id: OutputBlock["platform"];
  /** "CSS custom property", "Swift", … — what the file is, not a platform */
  language: string;
  /** the generated file per theme, repository-relative: each theme's declaration lives in its own file */
  files: { light: string; dark: string };
  /** how code on that platform refers to the token */
  reference: string;
  /** the declaration exactly as written in each theme's generated file */
  declaration: { light: string; dark: string };
  /** the implementation platforms that read this output, in manifest order */
  platforms: Platform[];
}

/* ------------------------------------------------------------------ component sources */

/**
 * Where each platform's `Switch` lives, and the line in it that reads the token.
 *
 * Keyed by `Platform`, so a sixth platform in the manifest is a type error here until someone points at its
 * real source — the diagram cannot quietly grow a node with nothing behind it. Every path must sit inside that
 * platform's own package directory (`platformDefinitions[].dir`); a path elsewhere is rejected, which is what
 * stops a "React" tab from ever showing an example file or a test instead of the implementation.
 */
type Excerpt = {
  file: string;
  language: HighlightLanguage;
  /** the line the window is centred on; the platform's `reads` pattern when omitted */
  anchor?: RegExp;
  /** search for `anchor` only after the first line matching this (a rule inside a large stylesheet) */
  after?: RegExp;
  /** lines kept before and after the anchor; the excerpt is a window, not the file */
  before?: number;
  following?: number;
};

/** Lines either side of the anchor by default: seven lines, enough to show the token read in its real context. */
const WINDOW = 3;

const SWITCH_SOURCES = {
  React: { reads: /bg-action\b/, files: [{ file: "packages/ui/src/components/switch.tsx", language: "tsx" }] },
  Angular: {
    reads: /hsl\(var\(--action\)\)/,
    files: [
      // the component: its selector and the start of its template (the colour lives in the package stylesheet)
      { file: "packages/ui-angular/src/lib/toggles.ts", language: "ts", anchor: /^  selector: 'kx-switch',$/, before: 1, following: 5 },
      { file: "packages/ui-angular/src/styles.css", language: "css", after: /^\.kx-switch \{/ },
    ],
  },
  SwiftUI: { reads: /colors\.action\b/, files: [{ file: "packages/ui-swiftui/Sources/KinetixUI/Switch.swift", language: "swift" }] },
  Compose: { reads: /colors\.action\b/, files: [{ file: "packages/ui-compose/ui/src/main/kotlin/com/kinetixui/ui/Switch.kt", language: "kotlin" }] },
  Flutter: { reads: /\bc\.action\b/, files: [{ file: "packages/ui-flutter/lib/src/switch.dart", language: "dart" }] },
} as const satisfies Record<Platform, { reads: RegExp; files: readonly Excerpt[] }>;

export interface SourceFile {
  /** repository-relative path */
  file: string;
  /** 1-based line numbers of the excerpt in that file */
  firstLine: number;
  lastLine: number;
  language: HighlightLanguage;
  /** the excerpt as plain text (what a copy button copies) */
  text: string;
  /** the excerpt, highlighted, line by line */
  lines: Token[][];
  /** 0-based indexes into `lines` of the lines that read the story token */
  readsToken: number[];
}

/**
 * Cut a window out of `text`: `before` lines above the anchor line and `following` below it (clamped to the file).
 * The homepage shows enough source to prove the line is real; the whole file is one link away.
 */
export function cut(text: string, spec: Excerpt, reads: RegExp): { first: number; last: number; body: string } {
  const all = text.replace(/\n$/, "").split("\n");
  const from0 = spec.after ? all.findIndex((l) => spec.after!.test(l)) : 0;
  if (from0 < 0) throw new Error(`systems-in-motion: ${spec.file} has no line matching ${spec.after}`);
  const anchor = spec.anchor ?? reads;
  const at = all.findIndex((l, i) => i >= from0 && anchor.test(l));
  if (at < 0) throw new Error(`systems-in-motion: ${spec.file} has no line matching ${anchor}`);
  const from = Math.max(0, at - (spec.before ?? WINDOW));
  const to = Math.min(all.length - 1, at + (spec.following ?? WINDOW));
  return { first: from + 1, last: to + 1, body: all.slice(from, to + 1).join("\n") };
}

/* ------------------------------------------------------------------ per platform */

export interface PlatformStory {
  platform: Platform;
  label: string;
  /** the manifest key: "Compose" rather than "Jetpack Compose", for tight layouts */
  short: string;
  family: "web" | "native";
  /** package maturity, verbatim: "stable" | "preview" */
  maturity: string;
  /** whether a gap on this platform is a decision (complete catalogue) or work still to do */
  catalogComplete: boolean;
  /** catalogue entries on this platform, and the catalogue total — two numbers, never a percentage */
  entries: number;
  total: number;
  /** "npm · @kinetixui/ui" or "Source checkout · not on a registry" */
  distribution: string;
  published: boolean;
  /** which generated output this platform's components read */
  output: TokenOutput["id"];
  /** the hand-written Switch on this platform */
  component: {
    files: SourceFile[];
    /** the first line, anywhere in those files, that reads the story token */
    reads: { file: string; line: number; code: string };
    /** the verification level for this component on this platform, from verification.json */
    verification: string | null;
    evidence: EvidenceKind[];
  };
  /** this platform's own setup page */
  href: string;
}

export interface SystemsInMotion {
  token: {
    /** `color.action` */
    path: string;
    /** the DTCG file the token is defined in, per theme */
    files: { light: string; dark: string };
    /** the alias chain to a literal, per theme: ["color.action", "color.primary", "color.azure.700"] */
    chain: { light: string[]; dark: string[] };
    resolved: { light: string; dark: string };
  };
  outputs: TokenOutput[];
  platforms: PlatformStory[];
}

const LANGUAGE_NAME: Record<OutputBlock["platform"], string> = {
  Web: "CSS",
  iOS: "Swift",
  Android: "Kotlin",
  Flutter: "Dart",
};

function distributionOf(p: Platform): { text: string; published: boolean } {
  const d = PLATFORM_DEFINITIONS[p].distribution;
  return d.published
    ? { text: `${d.channel} · ${PLATFORM_DEFINITIONS[p].package}`, published: true }
    : { text: "Source checkout · not on a registry", published: false };
}

/** Everything the homepage's system visuals show, read from the repository. */
export function systemsInMotion(root = repoRoot()): SystemsInMotion {
  const evidence = tokenEvidence(STORY_TOKEN, root);

  const chainFor = (theme: "light" | "dark") => {
    const rows = evidence.source.filter((r) => r.theme === theme || r.theme === "both");
    const chain = [`color.${STORY_TOKEN}`];
    for (let hop = 0; hop < 6; hop++) {
      const row = rows.find((r) => r.path === chain[chain.length - 1]);
      const next = row && /^\{([^}]+)\}$/.exec(row.value)?.[1];
      if (!next) break;
      chain.push(next);
    }
    return chain;
  };
  const fileFor = (theme: "light" | "dark") => {
    const row = evidence.source.find((r) => r.path === `color.${STORY_TOKEN}` && r.theme === theme);
    if (!row) throw new Error(`systems-in-motion: no ${theme} source row for color.${STORY_TOKEN}`);
    return row.file;
  };

  const outputs: TokenOutput[] = evidence.outputs.map((block) => ({
    id: block.platform,
    language: LANGUAGE_NAME[block.platform],
    files: { light: block.files[0]!, dark: block.files[1] ?? block.files[0]! },
    reference: block.reference,
    declaration: block.members,
    platforms: PLATFORMS.filter((p) => OUTPUT_OF[p] === block.platform),
  }));
  // Every output must feed at least one implementation, and every implementation must have an output.
  for (const o of outputs) if (o.platforms.length === 0) throw new Error(`systems-in-motion: ${o.id} output feeds no platform`);
  // The hero lays each output beside (or above) exactly the platforms that read it, so the outputs follow the
  // manifest's platform order and each one's platforms must be neighbours in it; otherwise the drawing would cross.
  outputs.sort((a, b) => PLATFORMS.indexOf(a.platforms[0]!) - PLATFORMS.indexOf(b.platforms[0]!));
  for (const o of outputs) {
    const at = o.platforms.map((p) => PLATFORMS.indexOf(p));
    if (at.some((i, k) => k > 0 && i !== at[k - 1]! + 1)) throw new Error(`systems-in-motion: ${o.id} feeds platforms that are not adjacent in the manifest`);
  }

  const read = (rel: string) => {
    const abs = join(root, rel);
    if (!existsSync(abs)) throw new Error(`systems-in-motion: ${rel} does not exist`);
    return readFileSync(abs, "utf8");
  };

  const platforms: PlatformStory[] = PLATFORMS.map((p) => {
    const def = PLATFORM_DEFINITIONS[p];
    const spec = SWITCH_SOURCES[p];
    const files: SourceFile[] = spec.files.map((f: Excerpt) => {
      if (!f.file.startsWith(`${def.dir}/`)) throw new Error(`systems-in-motion: ${p} source ${f.file} is outside ${def.dir}`);
      const { first, last, body } = cut(read(f.file), f, spec.reads);
      const plain = body.split("\n");
      return {
        file: f.file,
        firstLine: first,
        lastLine: last,
        language: f.language,
        text: body,
        lines: highlight(body, f.language),
        readsToken: plain.flatMap((l, i) => (spec.reads.test(l) ? [i] : [])),
      };
    });
    const hit = files.find((f) => f.readsToken.length > 0);
    if (!hit) throw new Error(`systems-in-motion: no ${p} source line matches ${spec.reads} — does its Switch still read ${STORY_TOKEN}?`);
    const index = hit.readsToken[0]!;
    const { text, published } = distributionOf(p);
    if (!OUTPUT_OF[p] || !outputs.some((o) => o.id === OUTPUT_OF[p])) throw new Error(`systems-in-motion: ${p} reads no generated output`);
    return {
      platform: p,
      label: def.label,
      short: p,
      family: def.family,
      maturity: def.maturity,
      catalogComplete: def.catalogComplete,
      entries: platformCount(p),
      total: componentTotal,
      distribution: text,
      published,
      output: OUTPUT_OF[p],
      component: {
        files,
        reads: { file: hit.file, line: hit.firstLine + index, code: hit.text.split("\n")[index]!.trim() },
        verification: verificationFor(STORY_COMPONENT, p),
        evidence: evidenceFor(STORY_COMPONENT, p),
      },
      href: SETUP_HREF[p],
    };
  });

  return {
    token: {
      path: `color.${STORY_TOKEN}`,
      files: { light: fileFor("light"), dark: fileFor("dark") },
      chain: { light: chainFor("light"), dark: chainFor("dark") },
      resolved: evidence.resolved,
    },
    outputs,
    platforms,
  };
}

/* ------------------------------------------------------------------ component strips and platform evidence */

/**
 * One component's state on every platform, for the component spotlight: the verification level where there is
 * an implementation, and the manifest's own word for the gap where there is not. Never a tick.
 */
export function componentStrip(slug: string): { platform: Platform; short: string; state: string; kind: "implementation" | "guidance" | "none" }[] {
  return PLATFORMS.map((p) => {
    const state = platformStateFor(slug, p);
    if (state === "implementation") return { platform: p, short: p, state: verificationFor(slug, p) ?? "implemented", kind: "implementation" };
    if (state) return { platform: p, short: p, state: GUIDANCE_LABEL[state.type].toLowerCase(), kind: "guidance" };
    return { platform: p, short: p, state: "not in manifest", kind: "none" };
  });
}

/** The evidence kinds the homepage summarises, in the order the platform docs present them. */
export const SUMMARY_EVIDENCE = ["build", "interaction", "accessibility", "rtl", "largeText", "reducedMotion"] as const;

export interface PlatformEvidence {
  platform: Platform;
  label: string;
  maturity: string;
  distribution: string;
  /** the weakest verification level across the platform's catalogue — a floor, never an average */
  floor: string | null;
  entries: number;
  total: number;
  /**
   * components holding each evidence kind, out of the platform's own entries, with what that count means:
   * a zero with no test behind it is "not yet verified", never an empty score (see `evidenceStatus`)
   */
  evidence: ({ kind: (typeof SUMMARY_EVIDENCE)[number] } & EvidenceStatus)[];
}

/** Per-platform proof for the evidence chapter, straight from `platform-parity.json`. */
export function platformEvidence(): PlatformEvidence[] {
  return PLATFORMS.map((p) => {
    const of = platformCount(p);
    return {
      platform: p,
      label: PLATFORM_DEFINITIONS[p].label,
      maturity: PLATFORM_DEFINITIONS[p].maturity,
      distribution: distributionOf(p).text,
      floor: CATALOGUE_VERIFICATION[p],
      entries: of,
      total: componentTotal,
      evidence: SUMMARY_EVIDENCE.map((kind) => {
        const status = evidenceStatus(p, kind);
        if (status.of !== of) throw new Error(`systems-in-motion: ${p} evidence is out of ${status.of}, not its ${of} entries`);
        return { kind, ...status };
      }),
    };
  });
}
