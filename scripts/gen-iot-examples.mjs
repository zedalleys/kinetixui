/**
 * gen-iot-examples.mjs — turn the real IoT composition files into the snippets the website shows.
 *
 *   node scripts/gen-iot-examples.mjs           write the generated module
 *   node scripts/gen-iot-examples.mjs --check   fail if it is stale, or a source has drifted (CI)
 *
 * The same idea as `gen-block-examples.mjs`, and deliberately not the same manifest.
 * `blocks.manifest.json` requires every platform in `components.manifest.json` for any published
 * block — `check-block-source.mjs` enforces it, and the `draft` escape hatch is excluded from the
 * website entirely. `@kinetixui/iot` is React-only, so an IoT composition could enter that catalogue
 * only untruthfully or invisibly. See `iot-examples.manifest.json` for the full reasoning.
 *
 * One file per example is the authoritative artifact: it renders the live preview AND is the snippet
 * source. The website used to carry hand-written copies of block code beside hand-written previews of
 * the "same" thing, and they had already drifted; this is the mechanism that stopped it.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(`${root}/${p}`, "utf8");
const CHECK = process.argv.includes("--check");

const MANIFEST = "iot-examples.manifest.json";
const OUT = "apps/web/src/registry/iot-examples.generated.ts";
/** Where an IoT example's source is allowed to live. Config is untrusted; a path outside this is a failure. */
const SOURCE_DIR = "apps/web/src/examples/iot/";
const SOURCE_EXT = ".tsx";

const manifest = JSON.parse(read(MANIFEST));
const problems = [];

/**
 * The text between `kx-iot:start` and `kx-iot:end`, marker lines dropped.
 *
 * The markers exist because a source file needs more than the example — imports, demo data, the
 * `"use client"` directive — and a reader copying the file wholesale would get all of it. The region
 * is what is worth copying; the rest is what makes the preview real. Keeping both in ONE file is the
 * point: a separate "clean copy for the docs" is the duplication this exists to prevent.
 */
function extract(relPath) {
  const text = read(relPath);
  const start = text.indexOf("kx-iot:start");
  const end = text.indexOf("kx-iot:end");
  if (start === -1 || end === -1 || end < start) {
    problems.push(`${relPath}: missing kx-iot:start / kx-iot:end markers`);
    return null;
  }
  const bodyStart = text.indexOf("\n", start) + 1;
  const bodyEnd = text.lastIndexOf("\n", end);
  const body = text.slice(bodyStart, bodyEnd).replace(/\n+$/, "");
  if (!body.trim()) {
    problems.push(`${relPath}: the kx-iot region is empty`);
    return null;
  }
  return body;
}

/**
 * What a reader copies must be the same controls the preview renders, from packages they can install.
 *
 *   - No hand-rolled control in the copyable region: a native `<button>`, `<input>`, `<select>` or `<textarea>`
 *     there is a local re-implementation of a KinetixUI component, and copying it copies the drift. Compose the
 *     library control (Button, Input, NativeSelect, Checkbox, RadioGroup, …) instead. (Wave 2d removed the last 28.)
 *   - Every `@kinetixui/*` import in an example file is a public package export, so the components the region uses
 *     resolve for a consumer exactly as they do here — never a monorepo source path.
 */
const PUBLIC_ENTRIES = new Set(
  ["packages/ui", "packages/iot"].flatMap((dir) => {
    const pkg = JSON.parse(read(`${dir}/package.json`));
    return Object.keys(pkg.exports ?? { ".": null })
      .filter((key) => !key.endsWith(".json") && !key.includes("tailwind"))
      .map((key) => (key === "." ? pkg.name : `${pkg.name}/${key.slice(2)}`));
  }),
);
const RAW_CONTROL = /^(button|input|select|textarea)$/;

function copyability(relPath, text) {
  const found = [];
  const file = ts.createSourceFile(relPath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const start = text.indexOf("kx-iot:start");
  const end = text.indexOf("kx-iot:end");
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const from = statement.moduleSpecifier.text;
    if (from.startsWith("@kinetixui/") && !PUBLIC_ENTRIES.has(from)) found.push(`imports "${from}", which is not a public package export`);
  }
  (function visit(node) {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.getStart(file) > start && node.getStart(file) < end) {
      const tag = node.tagName.getText(file);
      if (RAW_CONTROL.test(tag)) {
        const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
        found.push(`a raw <${tag}> at ${relPath}:${line} in the copyable region; compose the KinetixUI control instead`);
      }
    }
    ts.forEachChild(node, visit);
  })(file);
  return found;
}

const slugs = Object.keys(manifest.examples ?? {});
if (slugs.length === 0) problems.push(`${MANIFEST} declares no examples`);

const snippets = {};
for (const slug of slugs) {
  const entry = manifest.examples[slug];
  if (!/^[a-z][a-z0-9-]*$/.test(slug)) {
    problems.push(`${slug}: an example slug must be lowercase and hyphenated`);
    continue;
  }
  for (const field of ["title", "description", "source"]) {
    if (typeof entry?.[field] !== "string" || entry[field].length === 0) {
      problems.push(`${slug}: needs a non-empty "${field}"`);
    }
  }
  if (!Array.isArray(entry?.uses) || entry.uses.length === 0) {
    problems.push(`${slug}: needs a non-empty "uses" naming the components it composes`);
  }
  if (typeof entry?.source !== "string") continue;

  // Treated as untrusted config: inside the one directory, no traversal, right extension.
  if (!entry.source.startsWith(SOURCE_DIR) || entry.source.includes("..") || !entry.source.endsWith(SOURCE_EXT)) {
    problems.push(`${slug}: "source" must be a ${SOURCE_EXT} file inside ${SOURCE_DIR} (got ${entry.source})`);
    continue;
  }
  if (!existsSync(`${root}/${entry.source}`)) {
    problems.push(`${slug}: ${entry.source} does not exist`);
    continue;
  }

  // An example that names a component it does not import is a description that has drifted from the
  // thing it describes, which is exactly the failure this generator exists to make impossible.
  const source = read(entry.source);
  for (const used of entry.uses ?? []) {
    if (!new RegExp(`\\b${used}\\b`).test(source)) {
      problems.push(`${slug}: "uses" names ${used}, which ${entry.source} never mentions`);
    }
  }

  const body = extract(entry.source);
  if (body !== null) {
    snippets[slug] = body;
    problems.push(...copyability(entry.source, source).map((p) => `${slug}: ${p}`));
  }
}

if (problems.length) {
  console.error(problems.map((p) => `  x ${p}`).join("\n"));
  console.error(`\ngen:iot-examples failed (${problems.length}).`);
  process.exit(1);
}

const file =
  `/* AUTO-GENERATED by scripts/gen-iot-examples.mjs — do not edit.\n` +
  `   Source of truth: iot-examples.manifest.json → the real composition files under ${SOURCE_DIR} */\n` +
  `export const iotExampleSource: Record<string, string> = ${JSON.stringify(snippets, null, 2)};\n`;

const current = existsSync(`${root}/${OUT}`) ? read(OUT) : null;
if (CHECK) {
  if (current !== file) {
    console.error(`  x ${OUT} is stale — run \`pnpm gen:iot-examples\` and commit the result.`);
    process.exit(1);
  }
  console.log(`check:iot-examples ok — ${slugs.length} examples, snippets current.`);
} else {
  writeFileSync(`${root}/${OUT}`, file);
  console.log(`gen:iot-examples ok — ${slugs.length} examples written to ${OUT}.`);
}
