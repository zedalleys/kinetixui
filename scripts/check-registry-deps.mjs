/**
 * check-registry-deps.mjs — every npm package a registry item's files import must be one it declares.
 *
 *   pnpm check:registry-deps
 *
 * ## The failure this exists for
 *
 * `gen-registry.mjs` used to match dependencies against a hand-written list of package names, scanned over
 * the component file only — and then attached `lib/utils.ts` to the same item without scanning it.
 * `lib/utils.ts` imports `clsx` and `tailwind-merge`, so 91 of 97 items shipped a file whose two npm
 * dependencies they never declared. `npx @kinetixui/cli add card` exited 0 and left a project that could
 * not resolve either package. Nothing failed, because nothing was checking the *delivered set* — only the
 * part of it someone had remembered to scan.
 *
 * So this checks the invariant at the boundary that matters: the payloads under `apps/web/public/r/`, which
 * are what the CLI actually downloads. Each one carries its files' full text, so the imports being compared
 * are the ones a consumer will really have to resolve — not a re-derivation from repository sources that
 * might not be what shipped.
 *
 * ## Why it asserts in both directions
 *
 * **Missing** is the bug above: an import with no declaration means a consumer whose build fails.
 *
 * **Extra** is a different signal. These files are generated, and the generator derives dependencies from
 * imports, so it cannot produce a package nothing imports. One appearing means the generated output was
 * hand-edited, or the generator grew a special case — both of which are how the hand-maintained list came
 * to exist in the first place.
 *
 * `react` and `react-dom` are the entire exclusion set, matching the generator: a consumer of a React
 * component library has them, and an item that installs React into someone's project is worse than one
 * that assumes it.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SERVED = join(ROOT, "apps/web/public/r");
const SOURCE = join(ROOT, "registry/registry.json");

/** Kept identical to gen-registry.mjs on purpose: the checker must not be more permissive than the writer. */
export const RUNTIME_PROVIDED = new Set(["react", "react-dom"]);
const IMPORT_RE = /(?:^|[\s;}])(?:from|import)\s+["']([^"']+)["']/g;

export function packageOf(specifier) {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

export function npmImportsOf(code) {
  const found = new Set();
  for (const match of code.matchAll(IMPORT_RE)) {
    const specifier = match[1];
    if (specifier.startsWith(".") || specifier.startsWith("@/") || specifier.startsWith("node:")) continue;
    const pkg = packageOf(specifier);
    if (!RUNTIME_PROVIDED.has(pkg)) found.add(pkg);
  }
  return found;
}

/**
 * Audit the served registry. Exported so the release test suite can assert on the result rather than on
 * this script's exit code.
 */
export function auditServedRegistry(dir = SERVED) {
  const index = JSON.parse(readFileSync(join(dir, "registry.json"), "utf8"));
  const payloadNames = readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "registry.json");
  const problems = [];
  const items = [];

  for (const entry of index.items) {
    const file = `${entry.name}.json`;
    if (!payloadNames.includes(file)) {
      problems.push(`${entry.name}: listed in the index with no payload at r/${file}`);
      continue;
    }
    const payload = JSON.parse(readFileSync(join(dir, file), "utf8"));
    const declared = new Set(payload.dependencies ?? []);
    const required = new Set();
    const targets = [];
    for (const f of payload.files ?? []) {
      targets.push(f.target);
      for (const pkg of npmImportsOf(f.content ?? "")) required.add(pkg);
    }
    const missing = [...required].filter((p) => !declared.has(p)).sort();
    const extra = [...declared].filter((p) => !required.has(p)).sort();
    if (missing.length > 0) {
      problems.push(
        `${entry.name}: delivers ${targets.join(", ")} which import ${missing.join(", ")}, but does not declare ` +
          `${missing.length === 1 ? "it" : "them"}. A consumer running \`add ${entry.name}\` would not be able to build.`,
      );
    }
    if (extra.length > 0) {
      problems.push(
        `${entry.name}: declares ${extra.join(", ")}, which nothing it delivers imports. These files are ` +
          `generated from imports, so an extra package means the output was hand-edited.`,
      );
    }
    items.push({ name: entry.name, declared: [...declared].sort(), required: [...required].sort(), targets });
  }

  return { items, problems, payloadCount: payloadNames.length };
}

/** The served payloads and the source manifest must agree, or one of them is stale. */
export function auditSourceParity(sourceFile = SOURCE, dir = SERVED) {
  const source = JSON.parse(readFileSync(sourceFile, "utf8"));
  const problems = [];
  for (const entry of source.items) {
    let payload;
    try {
      payload = JSON.parse(readFileSync(join(dir, `${entry.name}.json`), "utf8"));
    } catch {
      problems.push(`${entry.name}: in registry/registry.json but not served from apps/web/public/r`);
      continue;
    }
    const a = [...(entry.dependencies ?? [])].sort().join(",");
    const b = [...(payload.dependencies ?? [])].sort().join(",");
    if (a !== b) {
      problems.push(
        `${entry.name}: dependencies differ between source and served output — source has [${a}], served has ` +
          `[${b}]. Run \`pnpm build:registry\`.`,
      );
    }
  }
  return problems;
}

function main() {
  const { items, problems, payloadCount } = auditServedRegistry();
  const parity = auditSourceParity();
  const all = [...problems, ...parity];

  if (all.length > 0) {
    console.error(`check:registry-deps — ${all.length} problem(s):\n`);
    for (const p of all) console.error(`  ✖ ${p}`);
    console.error(
      `\nDependencies are derived from every file an item delivers (scripts/gen-registry.mjs). If this is ` +
        `unexpected, re-run \`pnpm build:registry\` rather than editing the generated output.`,
    );
    process.exit(1);
  }

  const withUtils = items.filter((i) => i.targets.includes("lib/utils.ts")).length;
  const count = (pkg) => items.filter((i) => i.required.includes(pkg)).length;
  console.log(
    `check:registry-deps ok — ${items.length} item(s), ${payloadCount} payload(s); every npm import in every ` +
      `delivered file is declared.`,
  );
  console.log(
    `  ${withUtils} deliver lib/utils.ts · clsx ${count("clsx")} · tailwind-merge ${count("tailwind-merge")} · ` +
      `class-variance-authority ${count("class-variance-authority")} · @kinetixui/tokens ${count("@kinetixui/tokens")}`,
  );
}

if (process.argv[1] && process.argv[1].endsWith("check-registry-deps.mjs")) main();
