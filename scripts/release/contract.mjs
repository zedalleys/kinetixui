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
const SAFE_RELATIVE_PATH = /^(?!\/)(?![A-Za-z]:)(?!.*(^|\/)\.\.(\/|$))[\w./@-]+$/;
const SAFE_GROUP_NAME = /^[a-z][a-z0-9-]*$/;

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
    return { packages: [], registry: null, groups: {}, errors: ["release/publish-packages.json must be a JSON object."] };
  }
  const registry = typeof raw.registry === "string" && raw.registry.length > 0 ? raw.registry : null;
  if (!registry) errors.push(`release/publish-packages.json needs a "registry" URL.`);

  // Release groups. A package's group decides which release it belongs to, so an unknown or
  // missing one is a hard failure rather than something to default: guessing here would put a
  // package in a release nobody approved it for.
  const groups = {};
  if (raw.releaseGroups === null || typeof raw.releaseGroups !== "object" || Array.isArray(raw.releaseGroups)) {
    errors.push(`release/publish-packages.json needs a "releaseGroups" object.`);
  } else {
    for (const [name, config] of Object.entries(raw.releaseGroups)) {
      if (!SAFE_GROUP_NAME.test(name)) {
        errors.push(`release/publish-packages.json has an unusable release group name: ${JSON.stringify(name)}.`);
        continue;
      }
      if (config === null || typeof config !== "object" || Array.isArray(config)) {
        errors.push(`release group "${name}" must be an object.`);
        continue;
      }
      if (typeof config.sameVersion !== "boolean") {
        errors.push(`release group "${name}" needs a boolean "sameVersion".`);
        continue;
      }
      groups[name] = { sameVersion: config.sameVersion };
    }
  }

  if (!Array.isArray(raw.packages) || raw.packages.length === 0) {
    errors.push(`release/publish-packages.json needs a non-empty "packages" array.`);
    return { packages: [], registry, groups, errors };
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
    if (typeof entry.releaseGroup !== "string" || entry.releaseGroup.length === 0) {
      errors.push(`${entry.name} needs a "releaseGroup".`);
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(groups, entry.releaseGroup)) {
      errors.push(
        `${entry.name} is in release group "${entry.releaseGroup}", which "releaseGroups" does not define. ` +
          `Known groups: ${Object.keys(groups).join(", ") || "(none)"}.`,
      );
      continue;
    }

    // The artifact a package publishes is not always its workspace root — ng-packagr generates
    // @kinetixui/angular's package into `dist/`. This is config, so it is treated as untrusted:
    // relative, inside the repository, no traversal, and underneath the package it belongs to.
    let artifactDirectory = null;
    if (entry.artifactDirectory !== undefined) {
      const value = entry.artifactDirectory;
      if (typeof value !== "string" || !SAFE_RELATIVE_PATH.test(value)) {
        errors.push(`${entry.name} has an unusable "artifactDirectory": ${JSON.stringify(value)}.`);
        continue;
      }
      if (!value.startsWith(`${entry.directory}/`)) {
        errors.push(
          `${entry.name}: artifactDirectory "${value}" is not inside its package directory ` +
            `"${entry.directory}". A package may only publish an artifact it owns.`,
        );
        continue;
      }
      artifactDirectory = value;
    }

    packages.push({
      name: entry.name,
      releaseGroup: entry.releaseGroup,
      directory: entry.directory,
      artifactDirectory,
      // Where `pnpm pack` runs. The workspace directory stays the package's identity.
      packDirectory: artifactDirectory ?? entry.directory,
      build,
      requireFiles,
    });
  }

  for (const name of Object.keys(groups)) {
    if (!packages.some((pkg) => pkg.releaseGroup === name)) {
      errors.push(`release group "${name}" has no packages. Remove it, or give it one.`);
    }
  }

  return { packages, registry, groups, errors };
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
export function validatePublishMetadata(pkg, { expectedVersion = null, releaseGroup = null, packsFromArtifact = false, requireFiles = [] } = {}) {
  const errors = [];
  const m = pkg.manifest;
  const at = `${pkg.directory}/package.json`;
  const inGroup = releaseGroup ? ` release group "${releaseGroup}"` : " the published set";

  if (m.private === true) errors.push(`${pkg.name}: "private": true in ${at}, but it is allowlisted for npm.`);
  if (typeof m.version !== "string" || !SEMVER.test(m.version)) {
    errors.push(`${pkg.name}: ${at} needs a semver "version" (found ${JSON.stringify(m.version)}).`);
  } else if (expectedVersion && m.version !== expectedVersion) {
    // Cohort-scoped: a version differing from *another* cohort is the design, so the error names
    // the group whose lockstep rule was broken rather than implying the whole allowlist must match.
    errors.push(
      `${pkg.name}@${m.version} does not match${inGroup}, which releases at ${expectedVersion}.\n` +
        `  release group: ${releaseGroup ?? "(none)"}\n` +
        `  expected:      ${expectedVersion}\n` +
        `  actual:        ${m.version}\n` +
        `  package:       ${pkg.name} (${at})\n` +
        `Packages in a \`sameVersion\` group release together — run \`pnpm changeset version\` rather ` +
        `than editing ${at}. A package that should version independently belongs in its own release group.`,
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

  // `files` exists to stop npm packing a whole source directory. A package that packs from a
  // generated artifact directory has no source directory in the tarball to begin with — its
  // contents are whatever its generator wrote — so the rule would be asserting something that
  // cannot happen. Those packages are held to `requireFiles` instead, which names what the
  // artifact must contain and is checked against the packed tarball.
  if (packsFromArtifact) {
    if (requireFiles.length === 0) {
      errors.push(
        `${pkg.name}: it packs from an artifact directory, so "requireFiles" must name the paths ` +
          `that artifact has to contain. Nothing else constrains what the generator produced.`,
      );
    }
  } else if (!Array.isArray(m.files) || m.files.length === 0) {
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
