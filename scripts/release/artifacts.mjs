/**
 * Building, packing and proving the artifacts.
 *
 * The validation half (`validatePackedArtifact`) is pure: it takes the file list and manifest read
 * out of a tarball and says whether that tarball is publishable. The tarball is the thing npm
 * actually receives, so this is where entry points are checked — a manifest can declare
 * `dist/index.js` perfectly while `files` or a failed build leaves it out of the archive, and only
 * the packed form knows the difference.
 *
 * It is also where `workspace:` leakage is caught. Checking the source manifest would prove
 * nothing, because those specs are correct there and are rewritten during pack; checking the
 * packed manifest proves what a consumer would try to install.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { run, packageManagerCommand, resolveInside, runRootScript } from "./exec.mjs";
import { declaredTargets, PUBLISHED_DEPENDENCY_FIELDS } from "./contract.mjs";
import { readTarball, describePackage } from "./tar.mjs";

/**
 * @param {object} artifact
 * @param {string} artifact.name expected package name
 * @param {string} artifact.version expected version
 * @param {string[]} artifact.requireFiles extra tarball-relative paths the allowlist demands
 * @param {string[]} artifact.paths tarball contents, `package/` stripped
 * @param {object|null} artifact.manifest packed package.json
 * @param {string|null} [artifact.manifestError]
 * @returns {string[]} errors
 */
export function validatePackedArtifact({ name, version, requireFiles = [], paths, manifest, manifestError = null }) {
  const errors = [];
  if (manifestError) {
    errors.push(`${name}: ${manifestError}`);
    return errors;
  }
  const present = new Set(paths);

  if (manifest.name !== name) errors.push(`${name}: the packed tarball calls itself ${JSON.stringify(manifest.name)}.`);
  if (manifest.version !== version) {
    errors.push(`${name}: the packed tarball is version ${JSON.stringify(manifest.version)}, expected ${version}.`);
  }
  if (manifest.private === true) errors.push(`${name}: the packed manifest sets "private": true.`);
  if (manifest.publishConfig?.access !== "public") {
    errors.push(
      `${name}: the packed manifest has no "publishConfig": { "access": "public" }, so npm would ` +
        `treat this scoped package as restricted and reject it.`,
    );
  }

  for (const target of declaredTargets(manifest)) {
    if (!present.has(target.path)) {
      errors.push(
        `${name}: ${target.field} points at "${target.path}", which is not in the tarball. ` +
          `Either the build did not run or "files" excludes it — a consumer would fail to resolve it.`,
      );
    }
  }

  for (const required of requireFiles) {
    if (!present.has(required)) {
      errors.push(`${name}: release/publish-packages.json requires "${required}", which is not in the tarball.`);
    }
  }

  if (paths.length === 0) errors.push(`${name}: the tarball is empty.`);

  for (const field of PUBLISHED_DEPENDENCY_FIELDS) {
    for (const [dependency, spec] of Object.entries(manifest[field] ?? {})) {
      if (typeof spec === "string" && spec.startsWith("workspace:")) {
        errors.push(
          `${name}: ${field}.${dependency} is "${spec}" in the packed manifest. The workspace ` +
            `protocol did not get rewritten, so this would be unresolvable for anyone installing ` +
            `from npm.`,
        );
      }
    }
  }

  return errors;
}

/** Run every build the allowlist declares for the planned packages, once each, in order. */
export async function buildPlanned(plan, { root, log = () => {} }) {
  const seen = new Set();
  for (const target of plan.publish) {
    for (const script of target.allowlist.build) {
      if (seen.has(script)) continue;
      seen.add(script);
      log(`build: pnpm run ${script}`);
      await runRootScript(script, { cwd: root });
    }
  }
  return [...seen];
}

/** Pack one planned package and read the tarball back. */
export async function packOne(target, { root, outDir }) {
  const cwd = resolveInside(root, target.directory);
  const { file, prefix } = packageManagerCommand();
  const { stdout } = await run(file, [...prefix, "pack", "--pack-destination", outDir], { cwd });
  const printed = stdout.trim().split(/\r?\n/).filter(Boolean).pop();
  // pnpm prints the tarball path; trust its basename but resolve it inside our own temp directory
  // rather than using the printed path verbatim.
  const tarballPath = path.join(outDir, path.basename(printed ?? ""));
  const bytes = readFileSync(tarballPath);
  const { paths, manifest, manifestError } = describePackage(readTarball(bytes));
  return { ...target, tarball: tarballPath, size: bytes.length, paths, manifest, manifestError };
}

/** Pack every planned package into a fresh temp directory. */
export async function packPlanned(plan, { root, log = () => {} }) {
  const outDir = mkdtempSync(path.join(tmpdir(), "kinetixui-release-"));
  const packed = [];
  for (const target of plan.publish) {
    log(`pack: ${target.name}@${target.version}`);
    packed.push(await packOne(target, { root, outDir }));
  }
  return { outDir, packed };
}

/**
 * Install the packed tarballs into a throwaway consumer and prove they are usable from the
 * outside. Packing proves the files exist; this proves they resolve.
 *
 * The consumer is a directory in the system temp folder, installed with `--ignore-workspace` so
 * nothing about this repository's workspace is in scope. Whatever the tarball fails to declare, it
 * does not get.
 */
export async function smokeTest(packed, { root, log = () => {}, extraDependencies = [] } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "kinetixui-consumer-"));
  const errors = [];
  try {
    // @kinetixui/ui depends on @kinetixui/tokens at the exact version being released, which is by
    // definition not on the registry yet — the whole point is that nothing has been published. So
    // every package in this release resolves to its own tarball, and the consumer proves the
    // release set is internally consistent rather than proving the previous release still works.
    writeFileSync(
      path.join(dir, "package.json"),
      `${JSON.stringify({ name: "kinetixui-release-smoke", private: true, version: "1.0.0", type: "module" }, null, 2)}\n`,
    );
    // Its own pnpm-workspace.yaml, which makes this directory a root in its own right — nothing
    // about the KinetixUI workspace is in scope. pnpm 12 reads overrides from here rather than
    // from package.json.
    const overrides = packed.map((artifact) => `  "${artifact.name}": "file:${artifact.tarball.split(path.sep).join("/")}"`);
    writeFileSync(path.join(dir, "pnpm-workspace.yaml"), `packages: []\noverrides:\n${overrides.join("\n")}\n`);

    const { file, prefix } = packageManagerCommand();
    log(`smoke: installing ${packed.length} tarball(s) into a clean consumer`);
    await run(file, [...prefix, "add", ...extraDependencies, ...packed.map((p) => p.tarball)], { cwd: dir });

    for (const artifact of packed) {
      const check = SMOKE_TESTS[artifact.name];
      if (!check) continue;
      log(`smoke: ${artifact.name}`);
      try {
        await check({ dir, artifact, root });
      } catch (error) {
        errors.push(`${artifact.name}: consumer smoke test failed — ${error.message}`);
        if (error.stdout || error.stderr) {
          errors.push(`  ${String(error.stderr || error.stdout).trim().split("\n").slice(-4).join("\n  ")}`);
        }
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return errors;
}

/**
 * The per-package consumer contracts. Deliberately small and durable: the exporters, components and
 * token values have their own suites, and duplicating them here would make the release gate fail
 * for reasons that have nothing to do with packaging.
 */
const SMOKE_TESTS = {
  "@kinetixui/tokens": async ({ dir }) => {
    await runNodeScript(
      dir,
      `import * as tokens from "@kinetixui/tokens";
       import { createRequire } from "node:module";
       import { readFileSync } from "node:fs";
       if (typeof tokens.tokens !== "object" || tokens.tokens === null) throw new Error("no tokens export");
       const require = createRequire(import.meta.url);
       for (const target of ["dist/web/tokens.d.ts", "dist/web/globals.css", "dist/web/globals.dark.css"]) {
         const file = require.resolve("@kinetixui/tokens/package.json").replace("package.json", target);
         const text = readFileSync(file, "utf8");
         if (text.length === 0) throw new Error(target + " is empty");
       }`,
    );
  },
  "@kinetixui/ui": async ({ dir }) => {
    await runNodeScript(
      dir,
      `import * as ui from "@kinetixui/ui";
       // A small durable contract, not an export inventory: one component, one primitive set and
       // the class helper. Pinning all of them here would make a new component a release failure.
       for (const name of ["Button", "Dialog", "cn"]) {
         if (!(name in ui)) throw new Error("missing export: " + name);
       }
       if (Object.keys(ui).length < 50) throw new Error("suspiciously few exports: " + Object.keys(ui).length);`,
    );
  },
  "@kinetixui/cli": async ({ dir, artifact, root }) => {
    // The shim must exist — that is what `npx kinetixui` finds — but it is run through its target
    // rather than the shim itself: on Windows the shim is a `.cmd`, and Node will not spawn one
    // without a shell.
    const shim = path.join(dir, "node_modules", ".bin", process.platform === "win32" ? "kinetixui.cmd" : "kinetixui");
    if (!existsSync(shim)) throw new Error(`the installed package created no ${path.basename(shim)} shim`);

    const require = createRequire(pathToFileURL(path.join(dir, "index.mjs")));
    const manifest = JSON.parse(readFileSync(require.resolve("@kinetixui/cli/package.json"), "utf8"));
    const entry = path.resolve(path.dirname(require.resolve("@kinetixui/cli/package.json")), manifest.bin.kinetixui);

    const { stdout } = await run(process.execPath, [entry, "--version"], { cwd: dir });
    if (stdout.trim() !== artifact.version) {
      throw new Error(`\`kinetixui --version\` printed ${JSON.stringify(stdout.trim())}, expected ${artifact.version}`);
    }
    // The 0.23.0 headline feature, exercised end to end from the packed binary against a fixed
    // preset. Output shape only — the exporters' real assertions live in @kinetixui/create-theme.
    const preset = readFileSync(resolveInside(root, "release/smoke-preset.txt"), "utf8").trim();
    const expectations = {
      decode: /#/,
      css: /--action:/,
      swiftui: /Color\(red:/,
      compose: /Color\(0x[0-9a-f]{8}\)/,
      flutter: /Color\(0xFF[0-9A-F]{6}\)/,
    };
    for (const [command, expected] of Object.entries(expectations)) {
      const { stdout: out } = await run(process.execPath, [entry, "preset", command, preset], { cwd: dir });
      if (!expected.test(out)) throw new Error(`\`kinetixui preset ${command}\` produced nothing matching ${expected}`);
    }
  },
};

/** Run a snippet of ESM inside the throwaway consumer, so its resolution is the consumer's. */
async function runNodeScript(dir, source) {
  const file = path.join(dir, `smoke-${Math.random().toString(36).slice(2)}.mjs`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, source);
  try {
    await run(process.execPath, [file], { cwd: dir });
  } finally {
    rmSync(file, { force: true });
  }
}
