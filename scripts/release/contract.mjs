/**
 * The publication contract: what `release/publish-packages.json` may say, and what a package
 * manifest must contain before npm is allowed to see it.
 *
 * Both halves are pure. Everything they check is deterministic and local, which is the whole point
 * — these are the failures that must happen before the first publish, not between the second and
 * the third. @kinetixui/angular failed on exactly one of them (`publishConfig.access`) and it
 * failed at the registry, after @kinetixui/tokens had already been published.
 */

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const SAFE_SCRIPT_NAME = /^[a-z0-9][a-z0-9:_-]*$/i;
const SAFE_RELATIVE_PATH = /^(?!\/)(?!.*(^|\/)\.\.(\/|$))[\w./@-]+$/;

/** Dependency fields whose specs are rewritten at pack time and must not leak `workspace:`. */
export const PUBLISHED_DEPENDENCY_FIELDS = ["dependencies", "peerDependencies", "optionalDependencies"];

/**
 * Validate the allowlist file itself. A malformed allowlist is a preflight failure, not something
 * to interpret generously — "no packages" must never silently mean "publish nothing and call it a
 * success" because someone mistyped a key.
 *
 * @param {unknown} raw parsed release/publish-packages.json
 * @param {string[]} rootScriptNames scripts defined in the root package.json
 */
export function validateAllowlist(raw, rootScriptNames = []) {
  const errors = [];
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { packages: [], registry: null, errors: ["release/publish-packages.json must be a JSON object."] };
  }
  const registry = typeof raw.registry === "string" && raw.registry.length > 0 ? raw.registry : null;
  if (!registry) errors.push(`release/publish-packages.json needs a "registry" URL.`);

  if (!Array.isArray(raw.packages) || raw.packages.length === 0) {
    errors.push(`release/publish-packages.json needs a non-empty "packages" array.`);
    return { packages: [], registry, errors };
  }

  const packages = [];
  const seen = new Set();
  for (const [index, entry] of raw.packages.entries()) {
    const where = `release/publish-packages.json packages[${index}]`;
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push(`${where} must be an object.`);
      continue;
    }
    if (typeof entry.name !== "string" || !entry.name.startsWith("@kinetixui/")) {
      errors.push(`${where} needs a "name" in the @kinetixui scope.`);
      continue;
    }
    if (seen.has(entry.name)) errors.push(`${entry.name} is listed twice in release/publish-packages.json.`);
    seen.add(entry.name);
    if (typeof entry.directory !== "string" || !SAFE_RELATIVE_PATH.test(entry.directory)) {
      errors.push(`${entry.name} needs a repository-relative "directory".`);
      continue;
    }
    const build = Array.isArray(entry.build) ? entry.build : [];
    for (const script of build) {
      if (typeof script !== "string" || !SAFE_SCRIPT_NAME.test(script)) {
        errors.push(`${entry.name} lists an unusable build script name: ${JSON.stringify(script)}.`);
      } else if (rootScriptNames.length > 0 && !rootScriptNames.includes(script)) {
        errors.push(`${entry.name} lists build script "${script}", which the root package.json does not define.`);
      }
    }
    const requireFiles = Array.isArray(entry.requireFiles) ? entry.requireFiles : [];
    for (const file of requireFiles) {
      if (typeof file !== "string" || !SAFE_RELATIVE_PATH.test(file)) {
        errors.push(`${entry.name} lists an unusable requireFiles entry: ${JSON.stringify(file)}.`);
      }
    }
    packages.push({ name: entry.name, directory: entry.directory, build, requireFiles });
  }
  return { packages, registry, errors };
}

/**
 * Every path a manifest says a consumer can reach: `main`, `module`, `types`, `bin` and every leaf
 * of `exports`, normalised to tarball-relative paths. These are the strings that decide whether
 * `import "@kinetixui/ui"` resolves, so they are checked against what actually packed rather than
 * against the source tree.
 *
 * @param {object} manifest
 * @returns {{field: string, path: string}[]}
 */
export function declaredTargets(manifest) {
  const targets = [];
  const add = (field, value) => {
    if (typeof value !== "string") return;
    if (!value.startsWith("./")) return; // a bare specifier is a re-export, not a file in this tarball
    targets.push({ field, path: value.slice(2) });
  };
  const walk = (field, value) => {
    if (typeof value === "string") {
      add(field, value);
      return;
    }
    if (value && typeof value === "object") {
      for (const [key, inner] of Object.entries(value)) {
        // Subpath keys are "." and "./thing"; conditions are bare words. Bracketing the former
        // keeps the label readable — `exports["."].import` rather than `exports...import`.
        walk(key.startsWith(".") ? `${field}[${JSON.stringify(key)}]` : `${field}.${key}`, inner);
      }
    }
  };

  for (const field of ["main", "module", "types", "typings", "style"]) {
    if (typeof manifest[field] === "string") add(field, manifest[field].startsWith("./") ? manifest[field] : `./${manifest[field]}`);
  }
  if (manifest.exports !== undefined) walk("exports", manifest.exports);
  if (typeof manifest.bin === "string") add("bin", manifest.bin.startsWith("./") ? manifest.bin : `./${manifest.bin}`);
  else if (manifest.bin && typeof manifest.bin === "object") {
    for (const [name, value] of Object.entries(manifest.bin)) {
      if (typeof value === "string") add(`bin.${name}`, value.startsWith("./") ? value : `./${value}`);
    }
  }

  const unique = new Map();
  for (const target of targets) if (!unique.has(target.path)) unique.set(target.path, target);
  return [...unique.values()];
}

/**
 * The metadata a package must carry before it may be published.
 *
 * @param {{name: string, directory: string, manifest: object}} pkg
 * @param {{expectedVersion?: string|null}} [options]
 * @returns {string[]} errors
 */
export function validatePublishMetadata(pkg, { expectedVersion = null } = {}) {
  const errors = [];
  const m = pkg.manifest;
  const at = `${pkg.directory}/package.json`;

  if (m.private === true) errors.push(`${pkg.name}: "private": true in ${at}, but it is allowlisted for npm.`);
  if (typeof m.version !== "string" || !SEMVER.test(m.version)) {
    errors.push(`${pkg.name}: ${at} needs a semver "version" (found ${JSON.stringify(m.version)}).`);
  } else if (expectedVersion && m.version !== expectedVersion) {
    errors.push(
      `${pkg.name}@${m.version} does not match the other allowlisted packages at ${expectedVersion}. ` +
        `The published packages release as one version; run \`pnpm changeset version\` rather than editing ${at}.`,
    );
  }

  const access = m.publishConfig?.access;
  if (access !== "public") {
    errors.push(
      `${pkg.name}: ${at} needs "publishConfig": { "access": "public" }. ` +
        `npm treats a scoped package without it as restricted and rejects the publish with ` +
        `402 "You must sign up for private packages" — mid-release, after earlier packages have ` +
        `already been published.`,
    );
  }
  if (m.publishConfig?.provenance !== true) {
    errors.push(`${pkg.name}: ${at} needs "publishConfig": { "provenance": true } so the release is attested.`);
  }

  if (!Array.isArray(m.files) || m.files.length === 0) {
    errors.push(
      `${pkg.name}: ${at} needs a non-empty "files" array. Without it npm packs the whole package ` +
        `directory, which is how source-only or half-built packages reach the registry.`,
    );
  }
  if (typeof m.license !== "string" || m.license.length === 0) errors.push(`${pkg.name}: ${at} needs a "license".`);
  if (!m.repository) errors.push(`${pkg.name}: ${at} needs a "repository" (npm provenance verifies it).`);
  if (m.exports === undefined && m.main === undefined && m.bin === undefined) {
    errors.push(`${pkg.name}: ${at} declares no entry point — no "exports", "main" or "bin".`);
  }

  // `workspace:` specs in the source manifest are correct and expected — pnpm rewrites them while
  // packing. What matters is whether one survives into the tarball, which is checked against the
  // packed manifest by `validatePackedArtifact` rather than guessed at here.

  return errors;
}
