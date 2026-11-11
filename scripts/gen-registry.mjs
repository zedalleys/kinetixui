/**
 * Generate registry/registry.json + registry/kinetixui/ui/*.tsx from the
 * @kinetixui/ui source. Import paths are rewritten to the kinetixui CLI's
 * consumer convention (@/lib/utils, @/components/ui/<name>).
 *
 *   node scripts/gen-registry.mjs            write the output
 *   node scripts/gen-registry.mjs --check    prove the committed output is already that output
 *
 * ## Why --check exists
 *
 * `registry/kinetixui/ui/*.tsx` are COPIES of `packages/ui/src/components/*.tsx`. The copy is the thing a
 * consumer actually receives from `npx @kinetixui/cli add <name>`, so a copy that has fallen behind its
 * source ships different code to consumers than the package ships to importers, silently.
 *
 * CI's `Generated files in sync` step already catches a copy whose CONTENT drifted: the `build` job runs
 * `pnpm build:registry` and then `git diff`s the result, and a tracked file the generator rewrote shows up
 * there. Measured on `25e0bdff`: appending a line to `packages/ui/src/components/tabs.tsx` and regenerating
 * does fail that step.
 *
 * What that step cannot see is an OMISSION. `git diff` compares the worktree against the index and says
 * nothing about untracked files, and the step's `git add -N` is applied to the three native package
 * directories only — not to `registry/`. So this sequence passes CI on `25e0bdff`:
 *
 *   1. add a component to `packages/ui/src/components/`,
 *   2. run the generator, which writes `registry/registry.json` AND a new mirror file,
 *   3. commit the source and `registry.json`, and forget to `git add` the new mirror.
 *
 * CI regenerates the mirror into the worktree, `git diff` ignores it because it is untracked, every tracked
 * file matches, and the step is green — while `registry.json` declares a path that is not in the repository
 * and the published payload for that item resolves to nothing. Reproduced in a scratch worktree before this
 * mode was written.
 *
 * `--check` closes that by construction: it WRITES NOTHING and compares the output it would produce against
 * what is on disk, so a file the repository does not carry is reported `missing` rather than created and
 * then found. It is therefore only meaningful BEFORE any generator has run in the same job — see the CI step
 * ordering in `.github/workflows/ci.yml`.
 *
 * It also reports `orphan`: a file sitting in `registry/kinetixui/ui/` that no source component accounts for,
 * which is what a deleted or renamed component leaves behind.
 *
 * Determinism: the output depends on the source files, their sorted order and `registry/kinetixui/lib/utils.ts`
 * — no clock, no network, no environment. The mode is a few hundred file reads and needs no build, which is
 * why it can run as the first step of a job rather than after one.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { argv } from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Where the generator reads and writes. Every path below is derived from a root rather than from `ROOT`
 * directly, so the negative controls can point the whole generator at a throwaway copy of the three trees
 * it touches. That is the only reason this is a parameter: nothing in normal operation passes anything but
 * the repository root, and a control that mutated the real `registry/` would risk leaving it dirty.
 */
const layout = (root) => ({
  root,
  src: `${root}/packages/ui/src/components`,
  out: `${root}/registry/kinetixui/ui`,
  // `lib/utils.ts` ships with almost every item, so it is a mirror like the components are. It used to
  // be a hand-kept copy that the generator attached but never wrote, so a new export added to
  // `packages/ui/src/lib/utils.ts` shipped a component calling a function the delivered `lib/utils.ts`
  // did not have — a broken install that no gate could see, because the copy happened to be identical.
  lib: `${root}/packages/ui/src/lib/utils.ts`,
});

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

/* exported for scripts/registry-fixed-point-negative-controls.mjs */
/** Everything the generator would produce, as a pure value: no writes, no order dependence. */
export function buildRegistry(root = ROOT) {
  const { src: SRC, out: OUT, lib: LIB } = layout(root);
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
  /** repo-relative generated path -> exact bytes the generator would write there */
  const mirrors = new Map();
  mirrors.set("registry/kinetixui/lib/utils.ts", readFileSync(LIB, "utf8"));

  for (const file of files) {
    const name = file.replace(/\.tsx$/, "");
    let code = readFileSync(`${SRC}/${file}`, "utf8");

    code = code
      .replace(/from "\.\.\/lib\/utils"/g, 'from "@/lib/utils"')
      .replace(/from "\.\/([a-z-]+)"/g, 'from "@/components/ui/$1"');

    mirrors.set(`registry/kinetixui/ui/${file}`, code);

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
      // from `mirrors` when the generator owns the file: what ships is what it is about to write,
      // not whatever is on disk from the previous run.
      const delivered = mirrors.get(f.path) ?? readFileSync(`${root}/${f.path}`, "utf8");
      for (const pkg of npmImportsOf(delivered)) deps.add(pkg);
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

  const outputs = new Map(mirrors);
  outputs.set("registry/registry.json", JSON.stringify(manifest, null, 2) + "\n");
  return { outputs, items, componentCount: files.length };
}

/**
 * Every way the committed registry can disagree with its source, as a list of
 * `{ status, path }` — `stale`, `missing` or `orphan`. Empty means the committed
 * output IS this generator's fixed point. Exported so the negative controls can
 * drive it over a substituted source directory without touching the real one.
 */
export function registryDrift(root = ROOT) {
  const { outputs } = buildRegistry(root);
  const { out: OUT } = layout(root);
  const drift = [];
  for (const [path, expected] of outputs) {
    const abs = `${root}/${path}`;
    if (!existsSync(abs)) {
      drift.push({ status: "missing", path });
      continue;
    }
    if (readFileSync(abs, "utf8") !== expected) drift.push({ status: "stale", path });
  }
  // A file the generator would never write is a component that was deleted or renamed and left its mirror
  // behind. The content comparison above cannot see one, because it only ever looks at paths it expects.
  for (const file of readdirSync(OUT)) {
    const path = `registry/kinetixui/ui/${file}`;
    if (!outputs.has(path)) drift.push({ status: "orphan", path });
  }
  return drift.sort((a, b) => a.path.localeCompare(b.path) || a.status.localeCompare(b.status));
}

const EXPLAIN = {
  stale: "committed copy differs from what the source now generates",
  missing: "declared by the generator and absent from the repository",
  orphan: "no source component generates this file",
};

/**
 * Only act when this file is the entry point. Without this, `import { registryDrift } from
 * "./gen-registry.mjs"` in the negative controls would run the write branch as an import side effect and
 * rewrite the real `registry/` — which it did, once, before this guard was added.
 */
const RUN_DIRECTLY = resolve(argv[1] ?? "") === fileURLToPath(import.meta.url);

if (!RUN_DIRECTLY) {
  // imported for registryDrift/buildRegistry; do nothing
} else if (argv.includes("--check")) {
  const drift = registryDrift();
  if (drift.length === 0) {
    const { items, componentCount } = buildRegistry();
    console.log(
      `check:registry-fixed-point — committed registry is the fixed point of its source ` +
        `(${items.length} items, ${componentCount} component files mirrored).`,
    );
  } else {
    console.error("check:registry-fixed-point — the committed registry is NOT its source's fixed point:\n");
    for (const { status, path } of drift) console.error(`  ${status.padEnd(7)} ${path}  (${EXPLAIN[status]})`);
    console.error(
      `\n${drift.length} file(s). Run \`pnpm build:registry\` and commit the result — ` +
        `including any file git reports as untracked, which is what this gate exists to catch.`,
    );
    process.exit(1);
  }
} else {
  mkdirSync(layout(ROOT).out, { recursive: true });
  const { outputs, items, componentCount } = buildRegistry();
  for (const [path, content] of outputs) writeFileSync(`${ROOT}/${path}`, content);
  console.log(`registry.json — ${items.length} items; ${componentCount} component files mirrored`);
}
