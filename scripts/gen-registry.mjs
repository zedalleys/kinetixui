/**
 * Generate registry/registry.json + registry/kinetixui/ui/*.tsx from the
 * @kinetixui/ui source. Import paths are rewritten to the kinetixui CLI's
 * consumer convention (@/lib/utils, @/components/ui/<name>).
 *
 *   node scripts/gen-registry.mjs   (then: pnpm build:registry)
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = `${ROOT}/packages/ui/src/components`;
const OUT = `${ROOT}/registry/kinetixui/ui`;
mkdirSync(OUT, { recursive: true });

/**
 * What a registry item must tell the CLI to install.
 *
 * ## The bug this replaces
 *
 * Dependencies used to be matched against a hand-written list of package names, scanned over the component
 * file **only** — and then `lib/utils.ts` was attached to the same item a few lines later without being
 * scanned. `lib/utils.ts` imports `clsx` and `tailwind-merge`, so 91 of 97 items shipped a file whose two
 * npm dependencies they never declared. `npx @kinetixui/cli add card` exited 0 and left a project that
 * could not resolve either package. `button` looked fine only because `class-variance-authority` happens
 * to depend on `clsx`; it still failed on `tailwind-merge`.
 *
 * Two changes, and the second is why the first stays fixed:
 *
 * 1. Every file the item delivers is scanned, not just the component.
 * 2. The allowlist is gone. Imports are derived, so a dependency cannot be missed by not being on a list —
 *    which is the failure mode a list has. It also caught `@kinetixui/tokens`, imported for real by
 *    `kanban-board` and absent from the old list entirely.
 *
 * ## What is deliberately NOT declared
 *
 * `react` and `react-dom`: a consumer of a React component library has them, and a registry item that
 * installs React into someone's project is worse than one that assumes it. This is the entire exclusion
 * set, kept as narrow as possible — everything else a delivered file imports is something the consumer
 * genuinely has to install.
 *
 * Relative imports, `@/…` consumer-alias imports and `node:` builtins are not npm packages.
 */
const RUNTIME_PROVIDED = new Set(["react", "react-dom"]);

/** `import x from "y"`, `import "y"`, `import type { T } from "y"` — anything that makes "y" resolvable. */
const IMPORT_RE = /(?:^|[\s;}])(?:from|import)\s+["']([^"']+)["']/g;

/** "@scope/name/sub" -> "@scope/name"; "name/sub" -> "name". What you would pass to `npm install`. */
function packageOf(specifier) {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

/** The npm packages a single source file needs installed. */
function npmImportsOf(code) {
  const found = new Set();
  for (const match of code.matchAll(IMPORT_RE)) {
    const specifier = match[1];
    if (specifier.startsWith(".") || specifier.startsWith("@/") || specifier.startsWith("node:")) continue;
    const pkg = packageOf(specifier);
    if (!RUNTIME_PROVIDED.has(pkg)) found.add(pkg);
  }
  return found;
}

/** design-source-native components keep their bespoke docs blurb */
const NATIVE = new Set(["button", "input", "textarea"]);
const NODE = {
  button: "54863:351", input: "54855:13836", textarea: "54855:13857",
  select: "54855:13882", checkbox: "54863:483", "radio-group": "54863:536",
  switch: "54855:13984", badge: "54855:13995", tag: "54855:14021",
  modal: "54857:1322",
};

const items = [
  {
    name: "tokens",
    type: "registry:style",
    title: "KinetixUI token contract",
    description: "Semantic CSS variable contract (light + dark, HSL channels) plus primitive ramps.",
    files: [{ path: "registry/kinetixui/globals.css", type: "registry:file", target: "app/globals.css" }],
  },
];

const files = readdirSync(SRC).filter((f) => f.endsWith(".tsx")).sort();

for (const file of files) {
  const name = file.replace(/\.tsx$/, "");
  let code = readFileSync(`${SRC}/${file}`, "utf8");

  code = code
    .replace(/from "\.\.\/lib\/utils"/g, 'from "@/lib/utils"')
    .replace(/from "\.\/([a-z-]+)"/g, 'from "@/components/ui/$1"');

  writeFileSync(`${OUT}/${file}`, code);

  const registryDeps = new Set(["tokens"]);
  for (const m of code.matchAll(/from "@\/components\/ui\/([a-z-]+)"/g)) registryDeps.add(m[1]);

  const filesArr = [{ path: `registry/kinetixui/ui/${file}`, type: "registry:ui", target: `components/ui/${file}` }];
  if (code.includes('@/lib/utils')) {
    filesArr.push({ path: "registry/kinetixui/lib/utils.ts", type: "registry:lib", target: "lib/utils.ts" });
  }

  // Dependencies come from the delivered SET, after it is assembled. The component's rewritten source is
  // used from memory because that is what ships; the rest are read from the paths the item points at, so
  // adding a file to `filesArr` can never again leave its imports undeclared.
  const deps = new Set(npmImportsOf(code));
  for (const f of filesArr) {
    if (f.path === `registry/kinetixui/ui/${file}`) continue;
    for (const pkg of npmImportsOf(readFileSync(`${ROOT}/${f.path}`, "utf8"))) deps.add(pkg);
  }

  items.push({
    name,
    type: "registry:ui",
    title: name.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join(" "),
    description: NODE[name]
      ? `Reconciled 1:1 with the KinetixUI design source, node ${NODE[name]}.`
      : `Ported onto the KinetixUI token contract.`,
    dependencies: [...deps].sort(),
    registryDependencies: [...registryDeps],
    files: filesArr,
  });
}

const manifest = {
  $schema: "https://kinetixui.com/schema/registry.json",
  name: "kinetixui",
  homepage: "https://kinetixui.com",
  items,
};
writeFileSync(`${ROOT}/registry/registry.json`, JSON.stringify(manifest, null, 2) + "\n");
console.log(`registry.json — ${items.length} items; ${files.length} component files mirrored`);
