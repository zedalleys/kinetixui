/**
 * "One token, every platform" — the evidence on /docs/tokens, read out of the files the token build wrote.
 *
 * Nothing in this module holds a value. Every line it returns is found in the DTCG source or in
 * `packages/tokens/dist`, and a token or file it cannot find is an error, not an empty block: the page is
 * built from these files at build time, so a rename in the generator fails `next build` instead of leaving
 * the docs showing output that no longer exists. `token-evidence.test.ts` checks the other half — that the
 * values agree across platforms and with the source.
 *
 * Server-only (it reads the repository with node:fs), the same way `ComponentApi` reads `specs/`.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * The repository root. The dev server starts at the root and `next build` / vitest run inside apps/web, so
 * walk up for it instead of assuming one working directory.
 */
export function repoRoot(start = process.cwd()): string {
  let dir = start;
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, "tokens", "semantic")) && existsSync(join(dir, "packages", "tokens", "dist"))) return dir;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error(`token-evidence: no repository root above ${start}`);
}

type DtcgNode = { $value?: unknown; $type?: string; [key: string]: unknown };

/** `{color.azure.700}` → the node at that path in `tree`. */
function at(tree: DtcgNode, path: string): DtcgNode | undefined {
  return path.split(".").reduce<DtcgNode | undefined>((node, key) => node?.[key] as DtcgNode | undefined, tree);
}

const ALIAS = /^\{([^}]+)\}$/;

export interface SourceRow {
  /** dotted DTCG path, e.g. `color.primary` */
  path: string;
  /** repository-relative file the definition lives in */
  file: string;
  theme: "light" | "dark" | "both";
  /** the `$value` exactly as written: an alias such as `{color.azure.700}`, or a literal */
  value: string;
}

export interface OutputBlock {
  platform: "Web" | "iOS" | "Android" | "Flutter";
  /** the language label shown on the block, and its fence language */
  language: "css" | "swift" | "kotlin" | "dart";
  languageLabel: string;
  /** how a consumer refers to the token on this platform */
  reference: string;
  /** repository-relative files the excerpt comes from, light first */
  files: string[];
  /** the excerpt, line by line — each code line is a line of the file it names */
  lines: string[];
}

export interface TokenEvidence {
  token: string;
  source: SourceRow[];
  /** the resolved literal per theme, e.g. `#1d4ed8` */
  resolved: { light: string; dark: string };
  outputs: OutputBlock[];
}

const camel = (kebab: string) => kebab.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
const pascal = (kebab: string) => camel(kebab).replace(/^./, (c) => c.toUpperCase());

/** Drop a generated trailing doc comment (`/** … *\/`) from a declaration line; the declaration is what we show. */
const withoutTrailingComment = (line: string) => line.replace(/\s*\/\*\*.*\*\/\s*$/, "");

/**
 * Find `member` inside the block opened by `header` (a whole line). The block ends at the next line that is a
 * bare `}` at column 0 — the shape every generated file here uses. Returns the two lines exactly as written.
 */
export function excerpt(text: string, file: string, header: string, member: RegExp): { header: string; member: string } {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l === header);
  if (start < 0) throw new Error(`token-evidence: ${file} has no line ${JSON.stringify(header)}`);
  for (let i = start + 1; i < lines.length && lines[i] !== "}"; i++) {
    if (member.test(lines[i]!)) return { header, member: withoutTrailingComment(lines[i]!) };
  }
  throw new Error(`token-evidence: ${file} has no ${member} inside ${JSON.stringify(header)}`);
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/**
 * The evidence for one semantic colour token: its DTCG source (alias and the primitive it resolves to, both
 * themes) and the generated declaration on each platform, light and dark.
 */
export function tokenEvidence(name: string, root = repoRoot()): TokenEvidence {
  const read = (p: string) => readFileSync(join(root, p), "utf8");
  const json = (p: string) => JSON.parse(read(p)) as DtcgNode;

  const LIGHT = "tokens/semantic/color.light.json";
  const DARK = "tokens/semantic/color.dark.json";
  const PRIMITIVES = "tokens/primitives/color.json";
  const primitives = json(PRIMITIVES);

  const source: SourceRow[] = [];
  const resolve = (file: string, theme: "light" | "dark"): string => {
    const tree = json(file);
    const node = at(tree, `color.${name}`);
    if (typeof node?.$value !== "string") throw new Error(`token-evidence: ${file} defines no color.${name}`);
    source.push({ path: `color.${name}`, file, theme, value: node.$value });
    // Follow the alias chain the way Style Dictionary does: a semantic token may alias another semantic token in
    // the same theme file (`action` → `primary`) before it reaches a primitive.
    let value = node.$value;
    for (let hop = 0; hop < 6; hop++) {
      const alias = ALIAS.exec(value);
      if (!alias) return value;
      const local = at(tree, alias[1]!);
      const target = local ?? at(primitives, alias[1]!);
      if (typeof target?.$value !== "string") throw new Error(`token-evidence: color.${name} aliases ${alias[1]}, which neither ${file} nor ${PRIMITIVES} defines`);
      const row: SourceRow = local ? { path: alias[1]!, file, theme, value: target.$value } : { path: alias[1]!, file: PRIMITIVES, theme: "both", value: target.$value };
      if (!source.some((r) => r.path === row.path && r.file === row.file)) source.push(row);
      value = target.$value;
    }
    throw new Error(`token-evidence: color.${name} does not resolve within 6 aliases`);
  };
  const resolved = { light: resolve(LIGHT, "light"), dark: resolve(DARK, "dark") };
  // primitives after the semantic rows they explain, light's before dark's
  source.sort((a, b) => Number(a.file === PRIMITIVES) - Number(b.file === PRIMITIVES));

  const DIST = "packages/tokens/dist";
  const block = (
    platform: OutputBlock["platform"],
    language: OutputBlock["language"],
    languageLabel: string,
    reference: string,
    comment: (file: string) => string,
    files: [light: string, dark: string],
    headers: [light: string, dark: string],
    member: RegExp,
    closer: string,
  ): OutputBlock => {
    const lines: string[] = [];
    files.forEach((file, i) => {
      const found = excerpt(read(`${DIST}/${file}`), `${DIST}/${file}`, headers[i]!, member);
      if (i > 0) lines.push("");
      lines.push(comment(file), found.header, found.member, closer);
    });
    return { platform, language, languageLabel, reference, files: files.map((f) => `${DIST}/${f}`), lines };
  };

  const css = `--${name}`;
  const swift = camel(name);
  const kotlin = `color${pascal(name)}`;

  const web = block(
    "Web", "css", "CSS", `hsl(var(${css}))`,
    (f) => `/* ${f} */`,
    ["web/globals.css", "web/globals.dark.css"], [":root {", ".dark {"],
    new RegExp(`^\\s+${escape(css)}:`), "}",
  );
  // the light value is a reference to the primitive's own custom property; show that declaration too
  const lightRef = /var\((--[\w-]+)\)/.exec(web.lines[2]!)?.[1];
  if (lightRef) {
    const primitive = excerpt(read(`${DIST}/web/globals.css`), `${DIST}/web/globals.css`, ":root {", new RegExp(`^\\s+${escape(lightRef)}:`));
    web.lines.splice(2, 0, primitive.member);
  }

  const outputs: OutputBlock[] = [
    web,
    block(
      "iOS", "swift", "Swift · SwiftUI", `KinetixColorsSwiftUI.${swift}`,
      (f) => `// ${f}`,
      ["ios/KinetixColorsSwiftUI.swift", "ios/KinetixColorsSwiftUI.dark.swift"],
      ["public enum KinetixColorsSwiftUI {", "public enum KinetixColorsSwiftUIDark {"],
      new RegExp(`^\\s+public static let ${escape(swift)} = `), "}",
    ),
    block(
      "Android", "kotlin", "Kotlin · Jetpack Compose", `KinetixTheme.${kotlin}`,
      (f) => `// ${f}`,
      ["android/Theme.kt", "android/Theme.dark.kt"], ["object KinetixTheme {", "object KinetixThemeDark {"],
      new RegExp(`^\\s+val ${escape(kotlin)} = `), "}",
    ),
    block(
      "Flutter", "dart", "Dart · Flutter", `KinetixColorScheme.${swift}`,
      (f) => `// ${f}`,
      ["flutter/kinetix_color_scheme.dart", "flutter/kinetix_color_scheme.dark.dart"],
      ["class KinetixColorScheme {", "class KinetixColorSchemeDark {"],
      new RegExp(`^\\s+static const ${escape(swift)} = `), "}",
    ),
  ];

  return { token: name, source, resolved, outputs };
}

/** The token /docs/tokens follows across platforms. One place, so the page and its tests cannot disagree. */
export const EVIDENCE_TOKEN = "primary";
